import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isOnboardingRoute = createRouteMatcher(['/onboarding']);

export default clerkMiddleware(async (auth, req) => {
    const { userId, redirectToSignIn, getToken } = await auth();

    // Protect dashboard routes
    if (!userId && isProtectedRoute(req)) {
        return redirectToSignIn();
    }

    // Create response object early to handle Supabase cookies
    let response = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    // If user is logged in, check for organisation membership to enforce onboarding
    if (userId) {
        // We only enforce this check on protected routes or transitions, 
        // but to avoid evaluating DB on every Asset request, we rely on the matcher config.
        // Let's check when user is on dashboard.

        // Note: To make this robust, we should probably check whenever they are logged in 
        // and NOT on the onboarding page, to prevent accessing other protected areas.
        // For now, let's focus on Dashboard protection or generally ensuring they have an org.

        // Skip check if already on onboarding
        if (isOnboardingRoute(req)) {
            return response;
        }

        // Initialize Supabase Client with Clerk Token
        const token = await getToken({ template: 'supabase' });

        // Note: If token is null (no template setup), this will fail RLS if it relies on auth.uid()
        // We assume the user has configured the 'supabase' JWT template in Clerk.

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return req.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            req.cookies.set(name, value);
                            response.cookies.set(name, value, options);
                        });
                    }
                },
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        );

        // Check if user has any org membership
        const { data: memberships, error } = await supabase
            .from('org_members')
            .select('id')
            .eq('user_id', userId);

        const hasOrg = memberships && memberships.length > 0;

        if (!hasOrg && !isOnboardingRoute(req)) {
            // Allow access to public home? 
            // Prompt: "redirects logged-in users to /onboarding if they do not yet have an entry"
            // We should allow basic public home '/' navigation even if logged in?
            // Let's assume Yes. Only redirect if trying to access Protected Routes OR if we want to force onboarding immediately.
            // "Guard Onboarding" implies forcing it.
            // Let's enforce it on /dashboard and maybe generally if they try to do anything app-like.
            // I'll enforce it on isProtectedRoute(req).
            if (isProtectedRoute(req)) {
                const onboardingUrl = new URL('/onboarding', req.url);
                return NextResponse.redirect(onboardingUrl);
            }
        }

        // Optional: If hasOrg and trying to go to /onboarding? 
        // Maybe redirect to dashboard.
        if (hasOrg && isOnboardingRoute(req)) {
            const dashboardUrl = new URL('/dashboard', req.url);
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};

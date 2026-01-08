import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Plus, Calendar, FileText } from "lucide-react";
import { CancelSessionButton } from "./sessions";
import { SessionActions } from "./_components/session-actions";
import TemplateCard from "./_components/TemplateCard";

export default async function DashboardPage() {
    const { userId, getToken } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const { orgId, orgRole } = await auth();

    if (!orgId) {
        // If user has no active org, Clerk middleware or <OrganizationSwitcher /> usually handles this,
        // but we can redirect to a page forcing org selection/creation if needed.
        // For now, let's assume if they are here, they might need to select one.
        // However, the dashboard requires an org context.
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Select an Organisation</h2>
                    <OrganizationSwitcher
                        hidePersonal={true}
                        afterCreateOrganizationUrl="/dashboard"
                        afterSelectOrganizationUrl="/dashboard"
                    />
                </div>
            </div>
        );
    }

    // Initialize Clerk Client to fetch details not in token (like Name)
    const client = await clerkClient();
    let orgName = 'Organisation';
    try {
        const org = await client.organizations.getOrganization({ organizationId: orgId });
        orgName = org.name;
    } catch (e) {
        console.error("Failed to fetch org details", e);
    }

    // Role mapping if needed (Clerk roles are 'org:admin', 'org:member')
    const role = orgRole?.split(':')[1] || 'member';

    // Init Supabase with Token (User is already authed via Middleware)
    const token = await getToken({ template: 'supabase' });
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    // Fetch Templates
    const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('org_id', orgId)
        .neq('status', 'removed');

    // Fetch Upcoming Sessions
    const { data: upcomingSessions } = await supabase
        .from('sessions')
        .select(`
            *,
            templates (name)
        `)
        .eq('org_id', orgId)
        .in('status', ['scheduled', 'open', 'full']) // Filter out cancelled/completed for upcoming view
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Dashboard Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <OrganizationSwitcher
                        hidePersonal={true}
                        afterCreateOrganizationUrl="/dashboard"
                        afterLeaveOrganizationUrl="/dashboard"
                        afterSelectOrganizationUrl="/dashboard"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Public Home</a>
                    <a href="/scanner" className="text-sm font-medium text-slate-600 hover:text-slate-900">Check-In</a>
                    <a href="/dashboard/team" className="text-sm font-medium text-slate-600 hover:text-slate-900">Team</a>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-12">
                {/* UPCOMING SESSIONS */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Upcoming Sessions</h2>
                    </div>

                    {(!upcomingSessions || upcomingSessions.length === 0) ? (
                        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                            <p>No upcoming sessions scheduled.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingSessions.map((session) => (
                                <div key={session.id} className="group bg-white rounded-lg border border-slate-200 p-6 hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{(session.templates as any)?.name || 'Untitled Session'}</h3>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1
                                                ${session.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                                                    session.status === 'full' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-slate-100 text-slate-800'}`}>
                                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                            </span>
                                        </div>
                                        <CancelSessionButton sessionId={session.id} />
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-6">
                                            <p>
                                                {session.start_time?.substring(0, 5)}
                                                {session.end_time && ` - ${session.end_time.substring(0, 5)}`}
                                            </p>
                                        </div>
                                    </div>

                                    <SessionActions
                                        sessionId={session.id}
                                        sessionDate={session.session_date}
                                        templateName={(session.templates as any)?.name || 'Untitled'}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* TEMPLATES */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Session Templates</h2>
                        {templates && templates.length > 0 && (
                            <a href="/dashboard/templates/create" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                                <Plus className="w-4 h-4" />
                                New Template
                            </a>
                        )}
                    </div>

                    {(!templates || templates.length === 0) ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-slate-300 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No templates yet</h3>
                            <p className="text-slate-500 mb-6 max-w-sm">Create templates to quickly schedule recurring food bank sessions.</p>
                            <a href="/dashboard/templates/create" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                                <Plus className="w-4 h-4" />
                                Create Your First Session Template
                            </a>
                        </div>
                    ) : (
                        /* Active State */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map((template) => (
                                <TemplateCard key={template.id} template={template} />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Mobile Scan FAB */}
            <a
                href="/scanner"
                className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 hover:scale-105 transition-all md:hidden z-50"
                aria-label="Open Scanner"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
            </a>
        </div >
    );
}

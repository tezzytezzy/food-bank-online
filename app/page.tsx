import { createClient } from "@/lib/supabase";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  // Fetch 'public' sessions (assuming RLS allows or we use a workaround)
  // For now, standard fetch.
  // We also fetch organisations for the filters.

  // Note: If RLS blocks this, data will be empty.
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select(`
      *,
      organisations (
        name,
        country,
        state,
        city
      ),
      templates (
        name,
        dietary_info
      )
    `)
    .eq("status", "Scheduled")
    .gte("session_date", new Date().toISOString());

  // Derive unique locations for filters (conceptually)
  // In a real app we might want a distinct query.
  const { data: orgs } = await supabase
    .from("organisations")
    .select("country, state, city")
    .order("country");

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Community Food Bank</h1>

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
                <LogIn className="w-4 h-4" />
                Organisation Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="mr-4 text-sm font-medium text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Hero / Filters */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
            Find Food Support Near You
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Browse upcoming food bank sessions in your area. Use the filters below to refine your search.
          </p>
        </div>

        {/* Filters Placeholder - Ideally this filters the list below */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">All Countries</option>
              {/* Dynamically populate later */}
            </select>
            <select className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">All States</option>
            </select>
            <select className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">All Cities</option>
            </select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(!sessions || sessions.length === 0) ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <p>No upcoming sessions found matching your criteria.</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs mt-2 text-amber-600">Note: RLS policies might be hiding data if you are not an org member.</p>
              )}
            </div>
          ) : (
            sessions.map((session: any) => (
              <div key={session.id} className="group bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{session.organisations?.name || 'Unknown Org'}</h3>
                    <p className="text-sm text-slate-500">{session.organisations?.city}, {session.organisations?.country}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 text-slate-900">
                    {session.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    <strong className="font-medium">Date:</strong> {new Date(session.session_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong className="font-medium">Time:</strong> {session.start_time}
                  </p>
                  {session.templates?.dietary_info && (
                    <p className="text-xs text-slate-500 mt-2">
                      {session.templates.dietary_info}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

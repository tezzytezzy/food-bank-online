import { createClient } from "@/lib/supabase";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LogIn } from "lucide-react";


export default async function Home() {
  const supabase = await createClient();

  // 1. Build Query - Removed dietary_info
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(`
      *,
      organisations!inner (
        name
      ),
      templates (
        name
      )
    `)
    .in("status", ["scheduled", "open"]) // User requested Scheduled AND Open
    .gte("session_date", new Date().toLocaleDateString('en-CA')) // Future or Today (Local Time YYYY-MM-DD)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  // 2. Group by Organization
  type SessionWithOrg = typeof sessions extends (infer U)[] ? U : any;

  const groupedSessions: Record<string, SessionWithOrg[]> = {};

  if (sessions) {
    sessions.forEach((session) => {
      const orgName = session.organisations?.name || 'Unknown Organization';
      if (!groupedSessions[orgName]) {
        groupedSessions[orgName] = [];
      }
      groupedSessions[orgName].push(session);
    });
  }

  // Sort organization names to ensure consistent order
  const sortedOrgNames = Object.keys(groupedSessions).sort();

  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Food Bank Connect</h1>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                  <LogIn className="w-4 h-4" />
                  <span>Organisation Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl mb-6">
            Find Food Support Near You
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Browse upcoming food bank sessions below.
            Connect with local organizations to get the support you need.
          </p>
        </div>
      </section>

      {/* Sessions Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">

        {(!sessions || sessions.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-medium text-slate-900">No upcoming sessions found</h3>
            <p className="text-slate-500 mt-2">Check back later for new schedules.</p>
            {process.env.NODE_ENV === 'development' && error && (
              <p className="text-xs mt-4 text-red-500 bg-red-50 inline-block px-3 py-1 rounded-md">Error: {error.message}</p>
            )}
          </div>
        ) : (
          <div className="notebook-layout space-y-12">
            {sortedOrgNames.map((orgName) => (
              <div key={orgName} className="organization-group">
                {/* Organization Header */}
                <div className="flex items-center gap-4 mb-6 pb-2 border-b border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800">{orgName}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    {groupedSessions[orgName].length} Session{groupedSessions[orgName].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grid for this Org's Sessions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedSessions[orgName].map((session: any) => {
                    const sessionDate = new Date(session.session_date);
                    return (
                      <div key={session.id} className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                        {/* Status Bar */}
                        <div className={`h-1.5 w-full ${session.status === 'open' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                              ${session.status === 'open'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'}
                            `}>
                              {session.status === 'scheduled' ? 'Scheduled' : 'Open Now'}
                            </span>
                          </div>

                          <h4 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {session.templates?.name || 'General Session'}
                          </h4>

                          <div className="space-y-3 mt-2 flex-grow">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-1.5 bg-slate-50 rounded-md">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {sessionDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {sessionDate.getFullYear()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-slate-50 rounded-md">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-sm text-slate-700">
                                {session.start_time ? session.start_time.substring(0, 5) : 'TBD'}
                                {session.end_time && ` - ${session.end_time.substring(0, 5)}`}
                              </p>
                            </div>

                            {session.location && (
                              <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 bg-slate-50 rounded-md">
                                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                  {session.location}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-6 pt-6 border-t border-slate-100">
                            <button className="w-full inline-flex justify-center items-center px-4 py-2 bg-white border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import { createClient } from "@/lib/supabase";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LogIn } from "lucide-react";


export default async function Home() {
  const supabase = await createClient();

  // 1. Build Query
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(`
      *,
      organisations!inner (
        name
      ),
      templates (
        name,
        dietary_info
      )
    `)
    .in("status", ["scheduled", "open"]) // User requested Scheduled AND Open
    .gte("session_date", new Date().toLocaleDateString('en-CA')); // Future or Today (Local Time YYYY-MM-DD)

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Food Bank Connect</h1>

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer">
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

      {/* Hero */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
            Find Food Support
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Browse upcoming food bank sessions.
          </p>
        </div>

        {/* Sessions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(!sessions || sessions.length === 0) ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <p>No upcoming sessions found.</p>
              {process.env.NODE_ENV === 'development' && error && (
                <p className="text-xs mt-2 text-red-500">Error: {error.message}</p>
              )}
            </div>
          ) : (
            sessions.map((session: any) => (
              <div key={session.id} className="group bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{session.organisations?.name || 'Unknown Org'}</h3>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors
                    ${session.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-900 border-slate-200'}
                  `}>
                    {session.status === 'scheduled' ? 'Scheduled' : 'Open / Active'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    <strong className="font-medium">Date:</strong> {new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong className="font-medium">Time:</strong> {session.start_time ? session.start_time.substring(0, 5) : 'TBD'}
                    {session.end_time && ` - ${session.end_time.substring(0, 5)}`}
                  </p>
                  {session.templates?.dietary_info && (
                    <p className="text-xs text-slate-500 mt-2">
                      <strong className="font-medium text-slate-700">Dietary Info:</strong> {session.templates.dietary_info}
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

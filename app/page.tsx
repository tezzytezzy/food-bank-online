import { createClient } from "@/lib/supabase";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LogIn } from "lucide-react";
import HomeFilters from "@/components/home-filters";

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient();

  // Parse search params
  const params = await searchParams;
  const country = typeof params.country === 'string' ? params.country : undefined;
  const state = typeof params.state === 'string' ? params.state : undefined;
  const city = typeof params.city === 'string' ? params.city : undefined;

  // 1. Fetch Unique Locations for Filters
  // We need to get all distinct locations from organisations.
  // Note: Supabase doesn't have a "DISTINCT" select easily on client, so we fetch desired columns and dedupe in JS.
  // Ideally, use an RPC or a view for performance with large datasets.
  const { data: allOrgs } = await supabase
    .from("organisations")
    .select("country, state, city")
    .order("country");

  const countries = Array.from(new Set(allOrgs?.map(o => o.country).filter(Boolean) || []));

  // Filter states based on selected country (if any)
  const availableStates = allOrgs?.filter(o => !country || o.country === country);
  const states = Array.from(new Set(availableStates?.map(o => o.state).filter(Boolean) || []));

  // Filter cities based on selected state (if any)
  const availableCities = availableStates?.filter(o => !state || o.state === state);
  const cities = Array.from(new Set(availableCities?.map(o => o.city).filter(Boolean) || []));


  // 2. Build Query
  let query = supabase
    .from("sessions")
    .select(`
      *,
      organisations!inner (
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
    .in("status", ["scheduled", "open"]) // User requested Scheduled AND Open
    .gte("session_date", new Date().toLocaleDateString('en-CA')); // Future or Today (Local Time YYYY-MM-DD)

  // Apply Filters
  if (country) query = query.eq('organisations.country', country);
  if (state) query = query.eq('organisations.state', state);
  if (city) query = query.eq('organisations.city', city);

  const { data: sessions, error } = await query;

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

        {/* Filters Component */}
        <HomeFilters
          countries={countries}
          states={states}
          cities={cities}
        />

        {/* Sessions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(!sessions || sessions.length === 0) ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <p>No upcoming sessions found matching your criteria.</p>
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
                    <p className="text-sm text-slate-500">{session.organisations?.city}, {session.organisations?.state}, {session.organisations?.country}</p>
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

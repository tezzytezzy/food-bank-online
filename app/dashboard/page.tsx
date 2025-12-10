import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Plus, Calendar, FileText } from "lucide-react";

export default async function DashboardPage() {
    const { userId, getToken } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    // Init Supabase with Token
    const token = await getToken({ template: 'supabase' });
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { } // Read-only access here mostly, or allow set if needed
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    // Get User's Organisation (assuming single org for simplicity based on schema unique constraint "A user can only be one member per organisation" -- Wait.
    // Schema: "UNIQUE (org_id, user_id)" -> This means user+org pair is unique. It DOES NOT mean user can only be in one org.
    // Prompt text: "A user can only be one member per organisation".
    // Note: Usually users can be in multiple orgs.
    // But let's assume valid access to *one* org for the dashboard view, or list them?
    // "The RLS policies must only allow access to an organisation's data if the logged-in user is a member of that organisation."
    // "Onboarding... Create the entry... assigning the current user...".
    // For the Dashboard, let's fetch the FIRST organisation they are a member of.

    const { data: memberships, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, role, organisations(name, id)')
        .eq('user_id', userId);

    if (!memberships || memberships.length === 0) {
        redirect('/onboarding');
    }

    const currentOrg = memberships[0].organisations;
    const role = memberships[0].role;
    // @ts-ignore
    const orgName = currentOrg?.name || 'Your Organisation';
    // @ts-ignore
    const orgId = currentOrg?.id;

    // Fetch Templates
    const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('org_id', orgId);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Dashboard Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{orgName}</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{role} Dashboard</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Settings</button>
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {orgName.substring(0, 1)}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Session Templates</h2>
                    {/* If has templates, show crate session button? Prompt: "Active State: List all existing templates and a button to create a new session based on a template." -> Actually, usually you create a session FROM a template. */}
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
                            <div key={template.id} className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-900 mb-2">{template.name}</h3>
                                    <div className="text-sm text-slate-500 space-y-1 mb-4">
                                        {template.default_duration && <p>Duration: {template.default_duration} mins</p>}
                                        {template.dietary_info && <p>Dietary: {template.dietary_info}</p>}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-2">
                                    <a
                                        href={`/dashboard/sessions/create?template_id=${template.id}`}
                                        className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-medium py-2 rounded-md hover:bg-slate-50 transition-colors"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Schedule Session
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

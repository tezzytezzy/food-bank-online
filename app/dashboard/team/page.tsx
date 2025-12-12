import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus, User, Shield } from "lucide-react";

export default async function TeamPage() {
    const { userId, getToken } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

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

    // Get current user's org
    const { data: myMembership } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', userId)
        .single();

    if (!myMembership) {
        redirect('/onboarding');
    }

    // List all members
    const { data: members, error } = await supabase
        .from('org_members')
        .select('id, user_id, role, created_at') // Note: We don't have user details (email/name) in supabase yet easily, relies on Clerk. 
        // Syncing user details is a separate task or we use client-side Clerk fetch.
        // For MVP, we show User ID or Role.
        .eq('org_id', myMembership.org_id);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Manage your organisation members</p>
                </div>
                <div>
                    <a href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back to Dashboard</a>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Members</h2>
                    {myMembership.role === 'Admin' && (
                        <a href="/dashboard/team/invite" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                            <Plus className="w-4 h-4" />
                            Invite Member
                        </a>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">User ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members?.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-slate-600">
                                        {member.user_id === userId ? <span className="font-bold text-slate-900">You</span> : member.user_id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'Admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {member.role === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {(!members || members.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No members found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

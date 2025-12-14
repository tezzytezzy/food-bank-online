
import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus, User, Shield, Trash2 } from "lucide-react";
import { deleteMember } from "./actions";

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
        .select('id, user_id, role, created_at')
        .eq('org_id', myMembership.org_id);

    // Fetch user details from Clerk
    const client = await clerkClient();
    const userIds = members?.map(m => m.user_id) || [];

    let usersMap = new Map<string, any>();
    if (userIds.length > 0) {
        try {
            const users = await client.users.getUserList({ userId: userIds, limit: 100 });
            users.data.forEach(u => usersMap.set(u.id, u));
        } catch (err) {
            console.error('Failed to fetch Clerk users:', err);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Manage your organisation members</p>
                </div>
                <div className="flex items-center gap-4">
                    <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Public Home</a>
                    <a href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back to Dashboard</a>
                    <UserButton afterSignOutUrl="/" />
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
                                <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Joined</th>
                                {myMembership.role === 'Admin' && (
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members?.map((member) => {
                                const clerkUser = usersMap.get(member.user_id);
                                const primaryName = clerkUser?.username ||
                                    (`${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim()) ||
                                    clerkUser?.emailAddresses?.[0]?.emailAddress ||
                                    member.user_id;
                                const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
                                const joinedDate = new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                const isMe = member.user_id === userId;

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {(primaryName || '').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">
                                                        {isMe ? `${primaryName} (You)` : primaryName}
                                                    </p>
                                                    {email && (
                                                        <p className="text-xs text-slate-500">{email}</p>
                                                    )}
                                                </div>
                                            </div>
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
                                            {joinedDate}
                                        </td>
                                        {myMembership.role === 'Admin' && (
                                            <td className="px-6 py-4 text-right">
                                                {!isMe && (
                                                    <form action={deleteMember}>
                                                        <input type="hidden" name="memberId" value={member.id} />
                                                        <button
                                                            type="submit"
                                                            className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                                                            title="Delete member"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </form>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {(!members || members.length === 0) && (
                                <tr>
                                    <td colSpan={myMembership.role === 'Admin' ? 4 : 3} className="px-6 py-8 text-center text-slate-500">No members found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}


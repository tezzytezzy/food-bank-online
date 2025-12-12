'use client';

import { inviteUser } from "../actions";

export default function InvitePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm max-w-md w-full">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Invite New Member</h1>
                <p className="text-slate-500 mb-6">Send an email invitation to join your organisation.</p>

                <form action={inviteUser} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            required
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            placeholder="colleague@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                                <input type="radio" name="role" value="Viewer" defaultChecked className="text-slate-900 focus:ring-slate-900" />
                                <div>
                                    <div className="font-medium text-slate-900">Viewer</div>
                                    <div className="text-xs text-slate-500">Can view dashboard and sessions.</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
                                <input type="radio" name="role" value="Admin" className="text-slate-900 focus:ring-slate-900" />
                                <div>
                                    <div className="font-medium text-slate-900">Admin</div>
                                    <div className="text-xs text-slate-500">Full access to manage team and settings.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <a href="/dashboard/team" className="flex-1 py-2 px-4 border border-slate-300 rounded-md text-slate-700 text-center text-sm font-medium hover:bg-slate-50 transition-colors">
                            Cancel
                        </a>
                        <button type="submit" className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
                            Send Invitation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

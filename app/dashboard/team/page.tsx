import { OrganizationProfile } from "@clerk/nextjs";

export default function TeamPage() {
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
                </div>
            </header>
            <main className="flex-1 p-8 w-full flex justify-center">
                <OrganizationProfile
                    appearance={{
                        elements: {
                            rootBox: "w-full max-w-5xl shadow-none",
                            card: "shadow-sm border border-slate-200 rounded-lg w-full"
                        }
                    }}
                />
            </main>
        </div>
    );
}

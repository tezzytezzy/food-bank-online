import Scanner from '@/components/Scanner';

export default function ScannerPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Ticket Scanner</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">SCAN ATTENDEE TICKETS</p>
                </div>
                <div className="flex items-center gap-4">
                    <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Public Home</a>
                    <a href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back to Dashboard</a>
                </div>
            </header>
            <main className="flex-1 w-full">
                <Scanner />
            </main>
        </div>
    );
}

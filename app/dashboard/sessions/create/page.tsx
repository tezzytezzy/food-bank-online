import { getTemplates } from '../actions';
import CreateSessionForm from './create-session-form';

export default async function CreateSessionPage() {
    const templates = await getTemplates();

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Schedule New Session</h1>
                    <p className="mt-2 text-slate-600">Create a new session from an existing template.</p>
                </div>

                <CreateSessionForm templates={templates || []} />
            </div>
        </div>
    );
}

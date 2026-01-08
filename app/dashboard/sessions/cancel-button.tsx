'use client';

import { useState } from 'react';
import { cancelSession } from './actions';
import { Trash2, Loader2, StopCircle } from 'lucide-react';

export default function CancelSessionButton({ sessionId }: { sessionId: string }) {
    const [isPending, setIsPending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCancel = async () => {
        setIsPending(true);
        try {
            await cancelSession(sessionId);
            setShowConfirm(false);
        } catch (error) {
            alert('Failed to cancel session');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Cancel Session"
            >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                Cancel
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Session</h3>
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                            Are you sure you want to cancel this session? <strong>This action cannot be undone.</strong>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isPending}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isPending}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors min-w-[100px]"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

'use client';

import { useState } from 'react';
import { cancelSession } from './actions';
import { Trash2, Loader2, StopCircle } from 'lucide-react';

export default function CancelSessionButton({ sessionId }: { sessionId: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleCancel = async () => {
        if (confirm('Are you sure you want to cancel this session? This action cannot be undone.')) {
            setIsPending(true);
            try {
                await cancelSession(sessionId);
            } catch (error) {
                alert('Failed to cancel session');
            } finally {
                setIsPending(false);
            }
        }
    };

    return (
        <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Cancel Session"
        >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
            Cancel
        </button>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSession, SessionData } from '../actions';
import { Loader2, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
    id: string;
    name: string;
    start_time: string | null;
    end_time: string | null;
    ticket_format: 'Numeric' | 'Time-Allotted';
    time_slots_config: any; // Using any for simplicity as structure matches backend usage
}

interface CreateSessionFormProps {
    templates: Template[];
}

export default function CreateSessionForm({ templates }: CreateSessionFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [templateId, setTemplateId] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [status, setStatus] = useState<'scheduled' | 'open' | 'full' | 'completed' | 'cancelled'>('scheduled');

    // Helpers
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const toTimeStr = (minutes: number) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const calculateEndTime = (start: string, template: Template | undefined) => {
        if (!start || !template) return '';

        let duration = 0;

        if (template.ticket_format === 'Time-Allotted' && template.time_slots_config) {
            const config = template.time_slots_config;
            duration = (Number(config.slot_duration) || 0) * (Number(config.total_slots) || 0);
        } else if (template.start_time && template.end_time) {
            // Numeric: Duration = End - Start
            // We use the template's default duration to project the new end time
            duration = toMinutes(template.end_time) - toMinutes(template.start_time);
        }

        if (duration > 0) {
            const startMinutes = toMinutes(start);
            return toTimeStr(startMinutes + duration);
        } else if (template.end_time) {
            return template.end_time;
        }

        return '';
    };

    // Init Date to today and specific template if provided
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);

        const paramId = searchParams.get('template_id');
        if (paramId && templates.some(t => t.id === paramId)) {
            setTemplateId(paramId);
            const tmpl = templates.find(t => t.id === paramId);
            if (tmpl && tmpl.start_time) {
                // Ensure HH:MM format
                const start = tmpl.start_time.substring(0, 5);
                setStartTime(start);
                setEndTime(calculateEndTime(start, tmpl));
            }
        }
    }, [searchParams, templates]);

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setTemplateId(newId);

        if (newId) {
            const tmpl = templates.find(t => t.id === newId);
            if (tmpl && tmpl.start_time) {
                const start = tmpl.start_time.substring(0, 5);
                setStartTime(start);
                setEndTime(calculateEndTime(start, tmpl));
            } else {
                setStartTime('');
                setEndTime('');
            }
        }
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartTime(newStart);

        const tmpl = templates.find(t => t.id === templateId);
        if (tmpl) {
            setEndTime(calculateEndTime(newStart, tmpl));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const payload: SessionData = {
                template_id: templateId,
                session_date: date,
                start_time: startTime,
                status: status,
            };

            await createSession(payload);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setIsSubmitting(false);
        }
    };

    if (templates.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <p className="text-slate-500 mb-4">You need to create a template before you can schedule a session.</p>
                <button
                    onClick={() => router.push('/dashboard/templates/create')}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Create your first template &rarr;
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">

            {/* Template Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Select Template
                </label>
                <select
                    required
                    value={templateId}
                    onChange={handleTemplateChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                    <option value="">-- Choose a Template --</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                </div>
            </div>

            {/* Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Time */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Start Time
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="time"
                            required
                            value={startTime}
                            onChange={handleStartTimeChange}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                    </div>
                </div>

                {/* End Time (Locked) */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        End Time <span className="text-xs font-normal text-slate-500">(Auto-calculated)</span>
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="time"
                            value={endTime}
                            disabled
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            {/* Status */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Initial Status
                </label>
                <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                    <option value="scheduled">Scheduled</option>
                    <option value="open">Open (Active)</option>
                    <option value="full">Full</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                    Usually 'Scheduled' for future events, or 'Open' if happening now.
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 mt-6">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-900 text-white px-8 py-2 rounded-md font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" /> Schedule Session
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
                    {error}
                </div>
            )}
        </form>
    );
}

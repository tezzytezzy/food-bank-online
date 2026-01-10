'use client';

import { useState } from 'react';
import { Calendar, Trash2, Loader2, Clock, Users, MapPin } from 'lucide-react';
import { removeTemplate } from '../templates/actions';

interface TemplateCardProps {
    template: any; // Using any for now to match the implicit schema, ideally define a type
}

export default function TemplateCard({ template }: TemplateCardProps) {
    const [isRemoving, setIsRemoving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await removeTemplate(template.id);
            setShowConfirm(false);
        } catch (error) {
            console.error('Failed to remove template:', error);
            alert('Failed to remove template. Please try again.');
            setIsRemoving(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-colors relative group">
                {/* Remove Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all focus:opacity-100 cursor-pointer"
                    title="Remove Template"
                    aria-label="Remove Template"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <div>
                    <h3 className="font-semibold text-lg text-slate-900 mb-2 pr-8">{template.name}</h3>
                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                        {/* Time */}
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>
                                {template.start_time?.substring(0, 5)}
                                {template.end_time && ` - ${template.end_time.substring(0, 5)}`}
                            </span>
                        </div>

                        {/* Capacity & Format */}
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>
                                {template.capacity} · {template.ticket_format}
                            </span>
                        </div>

                        {/* Delivery Mode (Optional) */}
                        {template.delivery_mode && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{template.delivery_mode}</span>
                            </div>
                        )}
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

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Template</h3>
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                            Are you sure you want to remove this template? <strong>Removing it will hide it from your Dashboard and prevent new sessions from being created based on it</strong>, but it will not affect any sessions that have already been scheduled.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isRemoving}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={isRemoving}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors min-w-[100px]"
                            >
                                {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

'use client'

import { useState, useEffect } from 'react';
import { createTemplate, TemplateData } from '../actions';
import { Loader2, Plus, Trash2, Clock, Hash, Users, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function CreateTemplatePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [ticketType, setTicketType] = useState<'Numeric' | 'TimeAllotted'>('Numeric');
    const [distributionType, setDistributionType] = useState<'Sequential' | 'NonSequential'>('Sequential');

    // Numeric Config
    const [maxNumericTickets, setMaxNumericTickets] = useState<number | ''>('');

    // Time Config
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('');
    const [slotDuration, setSlotDuration] = useState<number | ''>(30); // minutes
    const [totalSlots, setTotalSlots] = useState<number | ''>(4);
    const [capacityPerSlot, setCapacityPerSlot] = useState<number | ''>(5);

    // Custom Fields
    const [customFields, setCustomFields] = useState<Array<{ label: string; type: string }>>([
        { label: '', type: 'text' },
    ]);

    // Helpers
    const totalTicketsAvailable = (typeof totalSlots === 'number' && typeof capacityPerSlot === 'number')
        ? totalSlots * capacityPerSlot
        : 0;

    const addCustomField = () => {
        setCustomFields([...customFields, { label: '', type: 'text' }]);
    };

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    const updateCustomField = (index: number, key: 'label' | 'type', value: string) => {
        const newFields = [...customFields];
        newFields[index] = { ...newFields[index], [key]: value };
        setCustomFields(newFields);
    };

    // Auto-calculate End Time for TimeAllotted
    useEffect(() => {
        if (ticketType === 'TimeAllotted' && startTime && slotDuration && totalSlots) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const totalMinutesRaw = (typeof slotDuration === 'number' ? slotDuration : 0) * (typeof totalSlots === 'number' ? totalSlots : 0);

            const startDate = new Date();
            startDate.setHours(hours, minutes, 0, 0);

            const endDate = new Date(startDate.getTime() + totalMinutesRaw * 60000);

            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

            setEndTime(`${endHours}:${endMinutes}`);
        } else if (ticketType === 'TimeAllotted') {
            // Reset or keep empty if inputs invalid
            // check if just one changed
        }
    }, [ticketType, startTime, slotDuration, totalSlots]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const payload: TemplateData = {
                name,
                ticket_type: ticketType,
                distribution_type: distributionType,
                required_user_fields: customFields.filter(f => f.label.trim() !== ''),
            };

            if (ticketType === 'Numeric') {
                if (!maxNumericTickets) throw new Error('Max tickets is required for numeric templates.');
                payload.max_numeric_tickets = Number(maxNumericTickets);
                // Also pass start time from state (it's now global)
                if (!endTime) throw new Error('End time is required.');

                payload.time_slots_config = {
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration: 0,
                    total_slots: 0,
                    capacity_per_slot: 0
                };
            } else {
                if (!startTime || !slotDuration || !totalSlots || !capacityPerSlot) {
                    throw new Error('All time slot configuration fields are required.');
                }
                payload.time_slots_config = {
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration: Number(slotDuration),
                    total_slots: Number(totalSlots),
                    capacity_per_slot: Number(capacityPerSlot)
                };
            }

            await createTemplate(payload);
            // Redirect happens in action
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Create Session Template</h1>
                    <p className="mt-2 text-slate-600">Define the rules and structure for your upcoming sessions.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* 1. Basic Info */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            Template Name
                        </h2>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Morning Food Distribution"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* 2. Ticketing Method */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Hash className="w-5 h-5 text-slate-500" /> Ticketing Logic
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-4 rounded-md border border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ticket Type</label>
                                <div className="flex gap-2 bg-white p-1 rounded-md border border-slate-200 inline-flex">
                                    <button
                                        type="button"
                                        onClick={() => setTicketType('Numeric')}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded transition-colors",
                                            ticketType === 'Numeric' ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Numeric
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTicketType('TimeAllotted')}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded transition-colors",
                                            ticketType === 'TimeAllotted' ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Time-Allotted
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {ticketType === 'Numeric'
                                        ? "Simple numbered tickets (1, 2, 3...)."
                                        : "Tickets booked for specific time slots."}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Distribution</label>
                                <div className="flex gap-2 bg-white p-1 rounded-md border border-slate-200 inline-flex">
                                    <button
                                        type="button"
                                        onClick={() => setDistributionType('Sequential')}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded transition-colors",
                                            distributionType === 'Sequential' ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Sequential
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDistributionType('NonSequential')}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded transition-colors",
                                            distributionType === 'NonSequential' ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        Non-Sequential
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {distributionType === 'Sequential'
                                        ? "Tickets issued in order A1, A2, A3..."
                                        : "Randomised or batched distribution."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Session Timing (Global) */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" /> Default Session Time
                        </h2>
                        <div className="flex gap-6">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                                />
                                <p className="mt-1 text-xs text-slate-500">Default start time.</p>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    disabled={ticketType === 'TimeAllotted'}
                                    className={cn(
                                        "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500",
                                        ticketType === 'TimeAllotted' && "bg-slate-100 text-slate-500 cursor-not-allowed"
                                    )}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    {ticketType === 'TimeAllotted' ? "Auto-calculated." : "Default end time."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4. Ticketing Configuration */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            {ticketType === 'Numeric' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Max Tickets
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={maxNumericTickets}
                                        onChange={(e) => setMaxNumericTickets(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                                        placeholder="Total tickets available"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Start Time moved global */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Slot Duration (mins)
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="5"
                                                step="5"
                                                value={slotDuration}
                                                onChange={(e) => setSlotDuration(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Total Number of Slots
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={totalSlots}
                                                onChange={(e) => setTotalSlots(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Capacity per Slot
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={capacityPerSlot}
                                                onChange={(e) => setCapacityPerSlot(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Confirmation Box */}
                                    <div className="bg-slate-900 text-slate-50 p-4 rounded-md flex items-center justify-between border-l-4 border-emerald-400">
                                        <span className="text-sm font-medium text-slate-300">Total Tickets Available</span>
                                        <span className="text-2xl font-bold">{totalTicketsAvailable}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Required User Data */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-500" /> Required User Data
                            </h2>
                            <button
                                type="button"
                                onClick={addCustomField}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add Field
                            </button>
                        </div>

                        <div className="space-y-3">
                            {customFields.map((field, index) => (
                                <div key={index} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                                            placeholder="Field Label (e.g. Dietary Requirements)"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Yes/No</option>
                                            <option value="textarea">Large Text Area</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCustomField(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Remove Field"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {customFields.length === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-4">No custom user fields defined.</p>
                            )}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-4 pt-4">
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
                            className="bg-slate-900 text-white px-8 py-2 rounded-md font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Template
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

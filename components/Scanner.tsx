"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { OfflineService, LocalTicket } from "@/lib/OfflineService";
import { Protect } from "@clerk/nextjs";
import { CheckCircle, Calculator, Keyboard } from "lucide-react"; // Icons

export default function Scanner() {
    const [mode, setMode] = useState<"menu" | "scan" | "manual" | "form" | "success">("menu");
    const [scannedKey, setScannedKey] = useState<string>("");
    const [ticket, setTicket] = useState<LocalTicket | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Lookup ticket in IDB
    const handleLookup = async (key: string) => {
        try {
            const found = await OfflineService.getTicket(key.toUpperCase());
            if (found) {
                setTicket(found);
                setScannedKey(found.ticket_key);
                // Initialize form data with existing or default
                const initialData: Record<string, any> = {};
                if (Array.isArray(found.required_user_fields)) {
                    found.required_user_fields.forEach((field: any) => {
                        initialData[field.label] = field.value || "";
                    });
                }
                setFormData(initialData);
                setMode("form");
            } else {
                alert("Ticket not found in offline database.");
            }
        } catch (e) {
            console.error(e);
            alert("Error looking up ticket.");
        }
    };

    // Scanner Logic
    useEffect(() => {
        if (mode === "scan") {
            // Small timeout to ensure DOM is ready
            const timeout = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
                );
                scannerRef.current = scanner;

                scanner.render(
                    (decodedText) => {
                        scanner.clear();
                        handleLookup(decodedText);
                    },
                    (error) => {
                        // console.warn(error);
                    }
                );
            }, 100);

            return () => {
                clearTimeout(timeout);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                }
            };
        }
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket) return;

        try {
            // Update ticket with new values in required_user_fields
            // We need to merge formData back into the array structure
            const updatedFields = (ticket.required_user_fields || []).map((field: any) => ({
                ...field,
                value: formData[field.label]
            }));

            await OfflineService.scanTicket(ticket.ticket_key, {
                required_user_fields: updatedFields
            });
            setMode("success");
        } catch (e) {
            console.error(e);
            alert("Failed to save ticket.");
        }
    };

    const handleReset = () => {
        setMode("menu");
        setTicket(null);
        setScannedKey("");
        setFormData({});
    };

    return (
        <Protect role="org:admin" fallback={<div className="p-4 text-center">Access Denied. Admins Only.</div>}>
            <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-50 flex flex-col items-center justify-center">

                {/* MENU MODE */}
                {mode === "menu" && (
                    <div className="space-y-6 w-full text-center">
                        <h1 className="text-2xl font-bold text-gray-800">Ticket Scanner</h1>
                        <div className="grid gap-4">
                            <button
                                onClick={() => setMode("scan")}
                                className="p-6 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition flex flex-col items-center gap-3"
                            >
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    {/* Icon placeholder for Camera */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                    </svg>
                                </div>
                                <span className="text-lg font-medium">Scan QR Code</span>
                            </button>

                            <button
                                onClick={() => setMode("manual")}
                                className="p-6 bg-white text-gray-700 rounded-xl shadow hover:bg-gray-50 transition flex flex-col items-center gap-3 border border-gray-200"
                            >
                                <Keyboard className="w-8 h-8 text-gray-400" />
                                <span className="text-lg font-medium">Manual Entry</span>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <button onClick={async () => {
                                // Sync Trigger
                                try {
                                    const summary = await OfflineService.syncSessionData();
                                    alert(`Sync Complete:\nSynced: ${summary.success}\nFailed: ${summary.failed}`);
                                } catch (e) {
                                    alert("Sync Error");
                                }
                            }} className="text-sm text-gray-500 underline">
                                Sync Now
                            </button>
                        </div>
                    </div>
                )}

                {/* SCAN MODE */}
                {mode === "scan" && (
                    <div className="w-full max-w-sm">
                        <div id="reader" className="w-full bg-black rounded-lg overflow-hidden"></div>
                        <button onClick={() => setMode("menu")} className="mt-4 px-4 py-2 text-gray-600 bg-white rounded shadow w-full">
                            Cancel
                        </button>
                    </div>
                )}

                {/* MANUAL MODE */}
                {mode === "manual" && (
                    <div className="w-full max-w-sm space-y-4">
                        <h2 className="text-xl font-semibold">Enter Ticket Key</h2>
                        <input
                            autoFocus
                            type="text"
                            className="w-full p-4 text-2xl text-center border rounded-lg active:border-blue-500 uppercase tracking-widest"
                            maxLength={6}
                            placeholder="A1B2C3"
                            onChange={(e) => {
                                if (e.target.value.length === 6) {
                                    handleLookup(e.target.value);
                                }
                            }}
                        />
                        <button onClick={() => setMode("menu")} className="w-full py-3 text-gray-600">
                            Back
                        </button>
                    </div>
                )}

                {/* FORM MODE */}
                {mode === "form" && ticket && (
                    <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl space-y-6">
                        <div className="border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{ticket.ticket_key}</h2>
                            <p className="text-gray-500 text-sm">{ticket.ticket_desc}</p>
                            {ticket.status === 'redeemed' && (
                                <span className="inline-block px-2 py-1 mt-2 text-xs font-bold text-yellow-800 bg-yellow-100 rounded">
                                    ALREADY REDEEMED
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {ticket.required_user_fields && ticket.required_user_fields.map((field, idx) => (
                                <div key={idx} className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                    <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        required
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        value={formData[field.label] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={handleReset} className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                                Confirm
                            </button>
                        </div>
                    </form>
                )}

                {/* SUCCESS MODE */}
                {mode === "success" && (
                    <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-24 h-24 text-green-500" />
                        <h2 className="text-2xl font-bold text-gray-800">Authorized</h2>
                        <p className="text-gray-500">Ticket redeemed successfully</p>
                        <button onClick={handleReset} autoFocus className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-full shadow-lg hover:scale-105 transition">
                            Scan Next
                        </button>
                    </div>
                )}
            </div>
        </Protect>
    );
}

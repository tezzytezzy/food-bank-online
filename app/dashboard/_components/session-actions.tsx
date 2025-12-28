'use client';

import { useState } from 'react';
import { Printer, Loader2, Database } from 'lucide-react';
import { generateSessionTicketsPdf } from '../sessions/actions';
import { OfflineService } from '@/lib/OfflineService';

interface SessionActionsProps {
    sessionId: string;
    sessionDate: string;
    templateName: string;
}

export function SessionActions({ sessionId, sessionDate, templateName }: SessionActionsProps) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = async () => {
        try {
            setIsPrinting(true);
            const base64Pdf = await generateSessionTicketsPdf(sessionId);

            // Decode and Download
            const binaryString = window.atob(base64Pdf);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Format nice filename
            // Convention: Tickets_[templates.name]_[YYYY-MMM-DD].pdf
            const d = new Date(sessionDate);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // Warning: getMonth/getDate depend on local time, but sessionDate string "YYYY-MM-DD" is usually parsed as UTC if ISO, or Local if simplified?
            // "2025-12-08" -> new Date("2025-12-08") is usually UTC. 
            // But getFullYear() uses local.
            // Better to parse the string manually to avoid timezone shifts.
            const parts = sessionDate.split('-');
            const year = parseInt(parts[0]);
            const monthIdx = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);

            const formattedDate = `${year}-${months[monthIdx]}-${String(day).padStart(2, '0')}`;
            const safeTemplateName = templateName.replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `Tickets_${safeTemplateName}_${formattedDate}.pdf`;

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Failed to print tickets:', error);
            alert('Failed to generate PDF: ' + (error.message || error));
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownloadOffline = async () => {
        try {
            setIsDownloading(true);
            const result = await OfflineService.downloadSessionData(sessionId);
            alert(`Successfully downloaded ${result.count} tickets for offline scanning.`);
        } catch (error: any) {
            console.error('Failed to download offline data:', error);
            alert('Failed to download data: ' + (error.message || error));
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                title="Print Tickets (PDF)"
            >
                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Print Tickets (PDF)
            </button>
            <button
                onClick={handleDownloadOffline}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                title="Download for Offline Scanning"
            >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Download Data
            </button>
        </div>
    );
}

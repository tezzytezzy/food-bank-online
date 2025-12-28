import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import fontkit from '@pdf-lib/fontkit';

// Types (mirroring the DB schema for relevant fields)
export interface Ticket {
    qr_code: string;
    id: number;
    assigned_value: string
}

// Constants
const MM_TO_PT = 2.8346;
const PAGE_WIDTH_MM = 297; // A4 Landscape
const PAGE_HEIGHT_MM = 210;
const PAGE_WIDTH = PAGE_WIDTH_MM * MM_TO_PT;
const PAGE_HEIGHT = PAGE_HEIGHT_MM * MM_TO_PT;

// Grid Configuration
const COLS = 3;
const ROWS = 6;
const TICKETS_PER_PAGE = COLS * ROWS;

const CELL_WIDTH_MM = 94;
const CELL_HEIGHT_MM = 34;
const CELL_WIDTH = CELL_WIDTH_MM * MM_TO_PT;
const CELL_HEIGHT = CELL_HEIGHT_MM * MM_TO_PT;
const CELL_PADDING = 4;

// QR Configuration
const QR_SIZE_MM = 30;
const QR_SIZE = QR_SIZE_MM * MM_TO_PT;
// const TEXT_AREA_WIDTH_MM = 60;
// const TEXT_AREA_WIDTH = TEXT_AREA_WIDTH_MM * MM_TO_PT;

// Margins (Centering the grid)
const GRID_WIDTH_MM = COLS * CELL_WIDTH_MM;
const GRID_HEIGHT_MM = ROWS * CELL_HEIGHT_MM;
const MARGIN_X_MM = (PAGE_WIDTH_MM - GRID_WIDTH_MM) / 2;
const MARGIN_Y_MM = (PAGE_HEIGHT_MM - GRID_HEIGHT_MM) / 2;
const MARGIN_X = MARGIN_X_MM * MM_TO_PT;
const MARGIN_Y = MARGIN_Y_MM * MM_TO_PT;

export async function generateTicketsPDF(tickets: Ticket[], sessionDate: string, templateName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Register the fontkit instance
    pdfDoc.registerFontkit(fontkit);

    // --- 1. Load the Font ---
    // Make sure the font file is in the same directory as this script or provide the correct path.
    // Use process.cwd() to ensure correct path resolution in Next.js server environment
    const fontBytes = fs.readFileSync(process.cwd() + '/app/fonts/Consolas-Regular.ttf');

    // --- 2. Embed the Font ---
    const customFont = await pdfDoc.embedFont(fontBytes);

    // Format Date: YYYY-MMM-DD (e.g., 2025-Dec-08)
    const dateObj = new Date(sessionDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${dateObj.getUTCFullYear()}-${months[dateObj.getUTCMonth()]}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;

    // Process tickets in chunks for pages
    for (let i = 0; i < tickets.length; i += TICKETS_PER_PAGE) {
        const pageTickets = tickets.slice(i, i + TICKETS_PER_PAGE);
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); // PDF-Lib uses [width, height]

        for (let j = 0; j < pageTickets.length; j++) {
            const ticket = pageTickets[j];

            // Calculate Grid Position (0-indexed)
            const col = j % COLS;
            const row = Math.floor(j / COLS);

            const x = MARGIN_X + (col * CELL_WIDTH);
            const y = PAGE_HEIGHT - MARGIN_Y - ((row + 1) * CELL_HEIGHT);

            // Draw standard Cell Border
            page.drawRectangle({
                x,
                y,
                width: CELL_WIDTH,
                height: CELL_HEIGHT,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
            });

            // Generate QR Code
            const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
                errorCorrectionLevel: 'H',
                version: 1,
                margin: 0,
                width: QR_SIZE
            });

            const qrImage = await pdfDoc.embedPng(qrDataUrl);

            // Draw QR Code
            const qrX = x + CELL_PADDING;
            const qrY = y + CELL_PADDING;

            page.drawImage(qrImage, {
                x: qrX,
                y: qrY,
                width: QR_SIZE,
                height: QR_SIZE,
            });

            // Draw Ticket Key
            page.drawText(ticket.qr_code, {
                x: x + QR_SIZE + CELL_PADDING * 2,
                y: y + QR_SIZE - CELL_PADDING * 2,
                size: 24,
                font: customFont,
                color: rgb(0, 0, 0),
            });

            // Draw Ticket Date and Time (Sequential No. or Time Alloted)
            // Combined format: "[Assigned Value] [YYYY-MMM-DD]"
            // Example: "1 2025-Jul-08" or "09:00 AM 2025-Jul-08"
            const ticketDisplayText = `${ticket.assigned_value} ${formattedDate}`;

            page.drawText(ticketDisplayText, {
                x: x + QR_SIZE + CELL_PADDING * 2,
                y: y + QR_SIZE - CELL_PADDING * 8,
                size: 14,
                font: customFont,
                color: rgb(0, 0, 0),
            });

            // Draw Template Name instead of hardcoded placeholder if desired, 
            // OR keep the "FS: DR:" placeholder if that was specific requirement.
            // Prompt says: "Data Requirement: ... include session.session_date and templates.name fields in the ticket generation process."
            // But details say: 
            // "Assigned Value Modification: [Date] appended to existing tickets.assigned_value".
            // It uses `templates.name` for the Filename.
            // It doesn't explicitly say to DRAW the template name on the ticket visual, but typically one might.
            // However, the prompt specifically listed changes to 'assigned_values'.
            // I will leave the third line as it was (User Data placeholder) or maybe put template name?
            // The previous code had `const ticketRequiredUserFields = "FS:     DR:     ";`
            // Let's leave that as is unless instructed, as the prompt focused on Date and Assigned Value on text.

            const ticketRequiredUserFields = "FS:     DR:     ";
            page.drawText(ticketRequiredUserFields, {
                x: x + QR_SIZE + CELL_PADDING * 2,
                y: y + QR_SIZE - CELL_PADDING * 14,
                size: 14,
                font: customFont,
                color: rgb(0, 0, 0),
            });
        }
    }

    return pdfDoc.save();
}

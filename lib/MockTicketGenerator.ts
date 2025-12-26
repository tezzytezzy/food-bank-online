import { PDFDocument, rgb, PageSizes, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import fs from 'fs';

// Types (mirroring the DB schema for relevant fields)
export interface Ticket {
    qr_code: string;
    id: number;
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

async function generateTicketsPDF(tickets: Ticket[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Register the fontkit instance
    pdfDoc.registerFontkit(fontkit);

    // --- 1. Load the Font ---
    // Make sure the font file is in the same directory as this script or provide the correct path.
    const fontBytes = fs.readFileSync('./app/fonts/Consolas-Regular.ttf');

    // --- 2. Embed the Font ---
    const customFont = await pdfDoc.embedFont(fontBytes);

    // // Embed the desired standard font (e.g., Times Roman)
    // const customFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Process tickets in chunks for pages
    for (let i = 0; i < tickets.length; i += TICKETS_PER_PAGE) {
        const pageTickets = tickets.slice(i, i + TICKETS_PER_PAGE);
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); // PDF-Lib uses [width, height]

        for (let j = 0; j < pageTickets.length; j++) {
            const ticket = pageTickets[j];

            // Calculate Grid Position (0-indexed)
            const col = j % COLS;
            const row = Math.floor(j / COLS);

            // Coordinate Calculation (Origin is Bottom-Left)
            // X: Margin + col * width
            // Y: PageHeight - Margin - (row + 1) * height   (Since we draw from bottom-left of the cell, or top-left?)
            // Let's verify Y. 
            // Row 0 should be at the top. Top Y = PageHeight - Margin.
            // Bottom Y of Row 0 cell = PageHeight - Margin - CellHeight.
            // So Block Y = PageHeight - Margin - (row * CellHeight) - CellHeight

            const x = MARGIN_X + (col * CELL_WIDTH);
            const y = PAGE_HEIGHT - MARGIN_Y - ((row + 1) * CELL_HEIGHT);

            // Draw standard Cell Border? Optional, usually helpful for cutting. 
            // Let's include light guides or just the content. 
            // Requirement says "Precise grid", often implies cutting lines. 
            // Let's just draw content for now to keep it clean unless requested.
            // Actually, let's include a very thin grey border for debugging/cutting.
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
                width: QR_SIZE // This is pixel width for canvas, but we embed as image
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
                x: x + QR_SIZE + CELL_PADDING * 2, // Approximation for centering, or use measureText if needed
                y: y + QR_SIZE - CELL_PADDING * 2,
                size: 24,
                font: customFont,
                color: rgb(0, 0, 0),
                // For perfect centering we'd measure text width but pdf-lib simplified doesn't always support easy measuring without embedding font first.
                // We'll trust basic centering for monospaced-ish appearance or precise enough.
            });

            // Draw Ticket Date and Time (Sequential No. or Time Alloted)
            // e.g. "No. 1 2025-Dec-24" or "12:00 PM 2025-Dec-24"

            const ticketDateTime = "12:00 PM 2025-Dec-24"; // "{{sessions.start_time}} {{sessions.session_date}}"

            page.drawText(ticketDateTime, {
                x: x + QR_SIZE + CELL_PADDING * 2, // Approximation for centering, or use measureText if needed
                y: y + QR_SIZE - CELL_PADDING * 8,
                size: 14,
                font: customFont,
                color: rgb(0, 0, 0),
                // For perfect centering we'd measure text width but pdf-lib simplified doesn't always support easy measuring without embedding font first.
                // We'll trust basic centering for monospaced-ish appearance or precise enough.
            });

            // Draw required_user_fields
            const ticketRequiredUserFields = "FS:     DR:     "; // {{templates.required_user_fields}}"
            page.drawText(ticketRequiredUserFields, {
                x: x + QR_SIZE + CELL_PADDING * 2, // Approximation for centering, or use measureText if needed
                y: y + QR_SIZE - CELL_PADDING * 14,
                size: 14,
                font: customFont,
                color: rgb(0, 0, 0),
                // For perfect centering we'd measure text width but pdf-lib simplified doesn't always support easy measuring without embedding font first.
                // We'll trust basic centering for monospaced-ish appearance or precise enough.
            });
        }
    }

    return pdfDoc.save();
}


function generateUniqueTicketKey(existing: Set<string>): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";

    do {
        key = "";
        for (let i = 0; i < 6; i++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (existing.has(key));

    existing.add(key);
    return key;
}

export function generateTickets(count: number = 50): Ticket[] {
    const tickets: Ticket[] = [];
    const usedKeys = new Set<string>();

    for (let i = 1; i <= count; i++) {
        tickets.push({
            qr_code: generateUniqueTicketKey(usedKeys),
            id: i
        });
    }

    return tickets;
}

function getFormattedDateTime(date: Date = new Date()): string {
    function padTwoDigits(num: number): string {
        return num.toString().padStart(2, "0");
    }

    const year = date.getFullYear();
    // Month is 0-indexed, so add 1
    const month = padTwoDigits(date.getMonth() + 1);
    const day = padTwoDigits(date.getDate());
    const hours = padTwoDigits(date.getHours());
    const minutes = padTwoDigits(date.getMinutes());
    const seconds = padTwoDigits(date.getSeconds());

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Add the current date to the filename
const formatted = getFormattedDateTime(new Date());

const tickets = generateTickets();

fs.writeFileSync("/home/tezza/Desktop/mock-tickets-" + formatted + ".pdf", await generateTicketsPDF(tickets));


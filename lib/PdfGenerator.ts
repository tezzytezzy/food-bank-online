import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import QRCode from 'qrcode';

// Types (mirroring the DB schema for relevant fields)
export interface Ticket {
    ticket_key: string;
    ticket_id: number;
}

// Constants
const MM_TO_PT = 2.8346;
const PAGE_WIDTH_MM = 297; // A4 Landscape
const PAGE_HEIGHT_MM = 210;
const PAGE_WIDTH = PAGE_WIDTH_MM * MM_TO_PT;
const PAGE_HEIGHT = PAGE_HEIGHT_MM * MM_TO_PT;

// Grid Configuration
const COLS = 9;
const ROWS = 5;
const TICKETS_PER_PAGE = COLS * ROWS;

const CELL_WIDTH_MM = 32;
const CELL_HEIGHT_MM = 38;
const CELL_WIDTH = CELL_WIDTH_MM * MM_TO_PT;
const CELL_HEIGHT = CELL_HEIGHT_MM * MM_TO_PT;

// QR Configuration
const QR_SIZE_MM = 30;
const QR_SIZE = QR_SIZE_MM * MM_TO_PT;
const TEXT_AREA_HEIGHT_MM = 8;
const TEXT_AREA_HEIGHT = TEXT_AREA_HEIGHT_MM * MM_TO_PT;

// Margins (Centering the grid)
const GRID_WIDTH_MM = COLS * CELL_WIDTH_MM;
const GRID_HEIGHT_MM = ROWS * CELL_HEIGHT_MM;
const MARGIN_X_MM = (PAGE_WIDTH_MM - GRID_WIDTH_MM) / 2;
const MARGIN_Y_MM = (PAGE_HEIGHT_MM - GRID_HEIGHT_MM) / 2;
const MARGIN_X = MARGIN_X_MM * MM_TO_PT;
const MARGIN_Y = MARGIN_Y_MM * MM_TO_PT;

export async function generateTicketsPDF(tickets: Ticket[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

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
            const qrDataUrl = await QRCode.toDataURL(ticket.ticket_key, {
                errorCorrectionLevel: 'H',
                version: 1,
                margin: 0,
                width: QR_SIZE // This is pixel width for canvas, but we embed as image
            });

            const qrImage = await pdfDoc.embedPng(qrDataUrl);

            // Draw QR Code
            // Centered horizontally in cell
            // Vertically: Top of cell. (Since text is below)
            // QR is 30mm. Cell is 38mm. Text area is 8mm.

            const qrX = x + (CELL_WIDTH - QR_SIZE) / 2;
            const qrY = y + TEXT_AREA_HEIGHT; // Bottom of QR is at y + 8mm

            page.drawImage(qrImage, {
                x: qrX,
                y: qrY,
                width: QR_SIZE,
                height: QR_SIZE,
            });

            // Draw Text
            // Centered in the 8mm space at bottom
            page.drawText(ticket.ticket_key, {
                x: x + CELL_WIDTH / 2 - (ticket.ticket_key.length * 3), // Approximation for centering, or use measureText if needed
                y: y + (TEXT_AREA_HEIGHT / 2) - 4, // Centered in the bottom 8mm
                size: 10,
                color: rgb(0, 0, 0),
                // For perfect centering we'd measure text width but pdf-lib simplified doesn't always support easy measuring without embedding font first.
                // We'll trust basic centering for monospaced-ish appearance or precise enough.
            });
        }
    }

    return pdfDoc.save();
}

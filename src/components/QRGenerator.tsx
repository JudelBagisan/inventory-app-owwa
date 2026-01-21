'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRGeneratorProps {
    data: string;
    itemName: string;
    size?: number;
}

export function QRGenerator({ data, itemName, size = 200 }: QRGeneratorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateQR = async () => {
            try {
                setIsLoading(true);
                const url = await QRCode.toDataURL(data, {
                    width: size,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                    errorCorrectionLevel: 'H',
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Error generating QR code:', err);
            } finally {
                setIsLoading(false);
            }
        };

        generateQR();
    }, [data, size]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - ${itemName}</title>
          <style>
            @page {
              size: 80mm 60mm;
              margin: 5mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 10px;
            }
            .qr-image {
              width: 150px;
              height: 150px;
            }
            .item-name {
              margin-top: 10px;
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .item-id {
              margin-top: 5px;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-image" />
            <div class="item-name">${itemName}</div>
            <div class="item-id">${data}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const handleDownload = async () => {
        if (!qrDataUrl) return;

        // Create a canvas to combine QR code and text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const qrSize = 300;
        const padding = 30;
        const textHeight = 60;
        const canvasWidth = qrSize + padding * 2;
        const canvasHeight = qrSize + padding * 2 + textHeight;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Load and draw QR code
        const qrImage = new Image();
        qrImage.onload = () => {
            ctx.drawImage(qrImage, padding, padding, qrSize, qrSize);

            // Draw item name
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(itemName.toUpperCase(), canvasWidth / 2, qrSize + padding + 25);

            // Draw ID
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText(data, canvasWidth / 2, qrSize + padding + 45);

            // Download the composite image
            const link = document.createElement('a');
            link.download = `qr-sticker-${data}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        qrImage.src = qrDataUrl;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            {/* QR Code Display */}
            <div className="qr-print-container bg-white p-6 rounded-xl shadow-lg">
                <img
                    src={qrDataUrl}
                    alt={`QR Code for ${itemName}`}
                    className="qr-image w-48 h-48 mx-auto"
                />
                <div className="qr-print-label mt-4 text-center">
                    <p className="text-lg font-bold text-gray-900">{itemName}</p>
                    <p className="text-sm text-gray-500 mt-1">{data}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="no-print flex gap-3 mt-6">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-md hover:shadow-lg"
                >
                    <PrintIcon className="w-5 h-5" />
                    Print QR
                </button>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                >
                    <DownloadIcon className="w-5 h-5" />
                    Download PNG
                </button>
            </div>
        </div>
    );
}

// Compact version for table/list view
interface QRGeneratorMiniProps {
    data: string;
    itemName: string;
    onPrint?: () => void;
}

export function QRGeneratorMini({ data, itemName, onPrint }: QRGeneratorMiniProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        const generateQR = async () => {
            try {
                const url = await QRCode.toDataURL(data, {
                    width: 64,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        };

        generateQR();
    }, [data]);

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - ${itemName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: Arial, sans-serif;
            }
            .qr-image { width: 150px; height: 150px; }
            .item-name { margin-top: 10px; font-size: 14pt; font-weight: bold; }
            .item-id { margin-top: 5px; font-size: 10pt; color: #666; }
          </style>
        </head>
        <body>
          <img src="${qrDataUrl}" alt="QR Code" class="qr-image" />
          <div class="item-name">${itemName}</div>
          <div class="item-id">${data}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    if (!qrDataUrl) {
        return <div className="w-16 h-16 bg-surface rounded animate-pulse" />;
    }

    return (
        <button
            onClick={handlePrint}
            className="group relative w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
            title={`Print QR for ${itemName}`}
        >
            <img
                src={qrDataUrl}
                alt={`QR Code for ${itemName}`}
                className="w-full h-full"
            />
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <PrintIcon className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </button>
    );
}

function PrintIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

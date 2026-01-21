'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Item } from '@/lib/types';

interface PropertyStickerProps {
    item: Item;
    onClose?: () => void;
}

export function PropertySticker({ item, onClose }: PropertyStickerProps) {
    const stickerRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const generateQR = async () => {
            try {
                setIsLoading(true);
                const url = await QRCode.toDataURL(item.unique_id, {
                    width: 200,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                    errorCorrectionLevel: 'H', // High error correction to allow logo overlay
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Error generating QR code:', err);
            } finally {
                setIsLoading(false);
            }
        };

        generateQR();
    }, [item.unique_id]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const formatCurrency = (amount: number | null) => {
            if (!amount) return 'N/A';
            return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        };

        const formatDate = (dateStr: string | null) => {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\//g, '-');
        };

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Property Sticker - ${item.name}</title>
                <style>
                    @page {
                        size: 100mm 70mm;
                        margin: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 9pt;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        background: #f0f0f0;
                    }
                    .sticker {
                        width: 100mm;
                        height: 70mm;
                        background: white;
                        border: 2px solid #333;
                        display: grid;
                        grid-template-columns: 45mm 1fr;
                        grid-template-rows: 1fr auto;
                    }
                    .left-section {
                        border-right: 2px solid #333;
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
                        color: white;
                        padding: 4px 8px;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 12pt;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .header h2 {
                        font-size: 10pt;
                        font-weight: bold;
                    }
                    .header p {
                        font-size: 7pt;
                        opacity: 0.9;
                    }
                    .qr-container {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 5px;
                        position: relative;
                    }
                    .qr-code {
                        width: 35mm;
                        height: 35mm;
                    }
                    .qr-logo {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 12mm;
                        height: 12mm;
                        background: white;
                        border-radius: 50%;
                        padding: 2px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .qr-logo img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    .property-no-section {
                        border-top: 2px solid #333;
                        padding: 4px 6px;
                        text-align: center;
                    }
                    .property-no-section .label {
                        font-size: 7pt;
                        color: #666;
                    }
                    .property-no-section .value {
                        font-size: 8pt;
                        font-weight: bold;
                        word-break: break-all;
                    }
                    .right-section {
                        padding: 6px 8px;
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }
                    .info-row {
                        display: flex;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 2px;
                    }
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    .info-label {
                        width: 22mm;
                        font-weight: bold;
                        font-size: 8pt;
                        color: #333;
                    }
                    .info-value {
                        flex: 1;
                        font-size: 8pt;
                        font-weight: 500;
                    }
                    .warning-section {
                        grid-column: 1 / -1;
                        border-top: 2px solid #333;
                        background: #fef2f2;
                        padding: 4px 10px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .warning-text {
                        font-size: 10pt;
                        font-weight: bold;
                        color: #dc2626;
                        letter-spacing: 3px;
                    }
                    .signature-row {
                        display: flex;
                        flex-direction: column;
                        min-height: 15mm;
                    }
                    .signature-line {
                        flex: 1;
                        border-bottom: 1px solid #333;
                        margin-top: 8mm;
                    }
                    @media print {
                        body {
                            background: white;
                        }
                        .sticker {
                            border: 2px solid #333;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="sticker">
                    <div class="left-section">
                        <div class="header">
                            <h1>OWWA</h1>
                            <h2>PROPERTY</h2>
                            <p>Scan the QR Code</p>
                        </div>
                        <div class="qr-container">
                            <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
                            <div class="qr-logo">
                                <img src="/owwa.svg" alt="OWWA Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                            </div>
                        </div>
                        <div class="property-no-section">
                            <div class="label">Property No</div>
                            <div class="value">${item.property_number || item.unique_id}</div>
                        </div>
                    </div>
                    <div class="right-section">
                        <div class="info-row">
                            <span class="info-label">Description:</span>
                            <span class="info-value">${item.name}${item.description ? ' - ' + item.description : ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Model Number:</span>
                            <span class="info-value">${item.serial_number || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Serial Number:</span>
                            <span class="info-value">${item.serial_number || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Acquisition Date:</span>
                            <span class="info-value">${formatDate(item.acquisition_date)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Acquisition Cost:</span>
                            <span class="info-value">${formatCurrency(item.acquisition_cost)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Person Accountable:</span>
                            <span class="info-value">${item.end_user || 'N/A'}</span>
                        </div>
                        <div class="info-row signature-row">
                            <span class="info-label">Signature of the Inventory Committee:</span>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                    <div class="warning-section">
                        <span class="warning-text">DO NOT REMOVE</span>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadSticker = async () => {
        if (!stickerRef.current) return;

        try {
            setIsDownloading(true);

            // Use html2canvas to capture the sticker element
            const canvas = await html2canvas(stickerRef.current, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    // Override lab() colors with rgb equivalents for html2canvas compatibility
                    const style = clonedDoc.createElement('style');
                    style.textContent = `
                        * {
                            color: rgb(0, 0, 0) !important;
                        }
                        .bg-white {
                            background-color: rgb(255, 255, 255) !important;
                        }
                        .bg-gradient-to-br {
                            background: linear-gradient(135deg, rgb(30, 58, 138) 0%, rgb(37, 99, 235) 100%) !important;
                        }
                        .from-blue-900 { background-color: rgb(30, 58, 138) !important; }
                        .to-blue-600 { background-color: rgb(37, 99, 235) !important; }
                        .bg-blue-900 { background-color: rgb(30, 58, 138) !important; }
                        .bg-blue-600 { background-color: rgb(37, 99, 235) !important; }
                        .bg-red-50 { background-color: rgb(254, 242, 242) !important; }
                        .text-white { color: rgb(255, 255, 255) !important; }
                        .text-gray-500 { color: rgb(107, 114, 128) !important; }
                        .text-red-600 { color: rgb(220, 38, 38) !important; }
                        .border-gray-300 { border-color: rgb(209, 213, 219) !important; }
                        .border-gray-200 { border-color: rgb(229, 231, 235) !important; }
                        .border-gray-400 { border-color: rgb(156, 163, 175) !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                },
            });

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (!blob) return;

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `property-sticker-${item.property_number || item.unique_id}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }, 'image/png', 1.0);
        } catch (err) {
            console.error('Error downloading sticker:', err);
        } finally {
            setIsDownloading(false);
        }
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
            {/* Preview */}
            <div ref={stickerRef} className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden" style={{ width: '400px' }}>
                {/* Sticker Preview */}
                <div className="grid grid-cols-2">
                    {/* Left Section */}
                    <div className="border-r-2 border-gray-300">
                        <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-3 text-center">
                            <h1 className="text-lg font-bold tracking-widest">OWWA</h1>
                            <h2 className="text-base font-bold">PROPERTY</h2>
                            <p className="text-xs opacity-90">Scan the QR Code</p>
                        </div>
                        <div className="flex items-center justify-center p-4 relative">
                            <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                            <div className="absolute bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-md p-1">
                                <img src="/owwa.svg" alt="OWWA Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <div className="border-t-2 border-gray-300 p-2 text-center">
                            <div className="text-[10px] text-gray-500">Property No</div>
                            <div className="text-xs font-bold break-all">{item.property_number || item.unique_id}</div>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="p-3 text-xs space-y-1">
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Description:</span>
                            <span className="flex-1">{item.name}</span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Model Number:</span>
                            <span className="flex-1">{item.serial_number || 'N/A'}</span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Serial Number:</span>
                            <span className="flex-1">{item.serial_number || 'N/A'}</span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Acquisition Date:</span>
                            <span className="flex-1">
                                {item.acquisition_date
                                    ? new Date(item.acquisition_date).toLocaleDateString('en-PH')
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Acquisition Cost:</span>
                            <span className="flex-1">
                                {item.acquisition_cost
                                    ? `₱${item.acquisition_cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="font-bold w-24">Person Accountable:</span>
                            <span className="flex-1">{item.end_user || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold">Signature of the Inventory Committee:</span>
                            <div className="border-b border-gray-400 mt-4 mb-2"></div>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="border-t-2 border-gray-300 bg-red-50 py-2 text-center">
                    <span className="text-red-600 font-bold tracking-widest text-sm">DO NOT REMOVE</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-md hover:shadow-lg"
                >
                    <PrintIcon className="w-5 h-5" />
                    Print Sticker
                </button>
                <button
                    onClick={handleDownloadSticker}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                    {isDownloading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <DownloadIcon className="w-5 h-5" />
                            Download PNG
                        </>
                    )}
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface-hover transition-colors"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
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


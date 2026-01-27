'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Item } from '@/lib/types';

interface BulkStickerGeneratorProps {
    items: Item[];
    onClose: () => void;
    mode: 'download' | 'print';
}

interface StickerData {
    item: Item;
    qrDataUrl: string;
}

export function BulkStickerGenerator({ items, onClose, mode }: BulkStickerGeneratorProps) {
    const [stickersData, setStickersData] = useState<StickerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadIndex, setDownloadIndex] = useState(0);
    const isCancelledRef = useRef(false);

    useEffect(() => {
        generateAllQRCodes();
    }, [items]);

    const generateAllQRCodes = async () => {
        setIsLoading(true);
        const data: StickerData[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                const qrDataUrl = await QRCode.toDataURL(item.unique_id, {
                    width: 200,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                    errorCorrectionLevel: 'H',
                });
                data.push({ item, qrDataUrl });
            } catch (err) {
                console.error('Error generating QR for', item.unique_id, err);
            }
            setProgress(Math.round(((i + 1) / items.length) * 100));
        }

        setStickersData(data);
        setIsLoading(false);

        // Auto-trigger print if in print mode
        if (mode === 'print' && data.length > 0) {
            setTimeout(() => {
                handlePrint(data);
            }, 500);
        }
    };

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

    const generateStickerHTML = (item: Item, qrDataUrl: string) => {
        return `
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
                            <img src="/DMW1.png" alt="OWWA Logo" />
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
                        <span class="info-label">Model No:</span>
                        <span class="info-value">${item.serial_number || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Serial No:</span>
                        <span class="info-value">${item.serial_number || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Acq. Date:</span>
                        <span class="info-value">${formatDate(item.acquisition_date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Acq. Cost:</span>
                        <span class="info-value">${formatCurrency(item.acquisition_cost)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Accountable:</span>
                        <span class="info-value">${item.end_user || 'N/A'}</span>
                    </div>
                    <div class="info-row signature-row">
                        <span class="info-label">Signature:</span>
                        <div class="signature-line"></div>
                    </div>
                </div>
                <div class="warning-section">
                    <span class="warning-text">DO NOT REMOVE</span>
                </div>
            </div>
        `;
    };

    const handlePrint = (data: StickerData[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print stickers');
            return;
        }

        // Generate stickers HTML
        let stickersHTML = '';
        data.forEach(({ item, qrDataUrl }) => {
            stickersHTML += generateStickerHTML(item, qrDataUrl);
        });

        // Group into pages of 10
        const stickersArray = stickersHTML.split('</div>\n            </div>').filter(s => s.trim());
        let pagesHTML = '';

        for (let i = 0; i < data.length; i += 10) {
            const pageStickers = data.slice(i, i + 10);
            let pageContent = '';
            pageStickers.forEach(({ item, qrDataUrl }) => {
                pageContent += generateStickerHTML(item, qrDataUrl);
            });
            pagesHTML += `<div class="page">${pageContent}</div>`;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bulk Property Stickers</title>
                <style>
                    @page {
                        size: Letter;
                        margin: 5mm;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 7pt;
                        background: white;
                    }
                    .page {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 3mm;
                        page-break-after: always;
                        padding: 2mm;
                    }
                    .page:last-child {
                        page-break-after: auto;
                    }
                    .sticker {
                        width: 95mm;
                        height: 52mm;
                        background: white;
                        border: 1.5px solid #333;
                        display: grid;
                        grid-template-columns: 38mm 1fr;
                        grid-template-rows: 1fr auto;
                        overflow: hidden;
                    }
                    .left-section {
                        border-right: 1.5px solid #333;
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
                        color: white;
                        padding: 2px 4px;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 9pt;
                        font-weight: bold;
                        letter-spacing: 1px;
                    }
                    .header h2 {
                        font-size: 7pt;
                        font-weight: bold;
                    }
                    .header p {
                        font-size: 5pt;
                        opacity: 0.9;
                    }
                    .qr-container {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2px;
                        position: relative;
                    }
                    .qr-code {
                        width: 28mm;
                        height: 28mm;
                    }
                    .qr-logo {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 9mm;
                        height: 9mm;
                        background: white;
                        border-radius: 50%;
                        padding: 1px;
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
                        border-top: 1.5px solid #333;
                        padding: 2px 3px;
                        text-align: center;
                    }
                    .property-no-section .label {
                        font-size: 5pt;
                        color: #666;
                    }
                    .property-no-section .value {
                        font-size: 6pt;
                        font-weight: bold;
                        word-break: break-all;
                    }
                    .right-section {
                        padding: 3px 4px;
                        display: flex;
                        flex-direction: column;
                        gap: 1px;
                    }
                    .info-row {
                        display: flex;
                        border-bottom: 0.5px solid #ddd;
                        padding-bottom: 1px;
                    }
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    .info-label {
                        width: 18mm;
                        font-weight: bold;
                        font-size: 6pt;
                        color: #333;
                    }
                    .info-value {
                        flex: 1;
                        font-size: 6pt;
                        font-weight: 500;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .warning-section {
                        grid-column: 1 / -1;
                        border-top: 1.5px solid #333;
                        background: #fef2f2;
                        padding: 2px 6px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .warning-text {
                        font-size: 7pt;
                        font-weight: bold;
                        color: #dc2626;
                        letter-spacing: 2px;
                    }
                    .signature-row {
                        flex-direction: column;
                        min-height: 8mm;
                    }
                    .signature-line {
                        flex: 1;
                        border-bottom: 0.5px solid #333;
                        margin-top: 4mm;
                    }
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                ${pagesHTML}
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
        onClose();
    };

    const handleBulkDownload = async () => {
        setIsProcessing(true);
        setProgress(0);
        isCancelledRef.current = false;

        try {
            // Dynamic import of JSZip to avoid SSR issues
            const JSZip = (await import('jszip')).default;
            const html2canvas = (await import('html2canvas')).default;

            const zip = new JSZip();

            for (let i = 0; i < stickersData.length; i++) {
                // Check if cancelled
                if (isCancelledRef.current) {
                    console.log('Download cancelled by user');
                    setIsProcessing(false);
                    return;
                }

                const { item, qrDataUrl } = stickersData[i];
                setDownloadIndex(i + 1);

                // Create a temporary container
                const container = document.createElement('div');
                container.style.cssText = 'position: fixed; left: -9999px; top: 0; z-index: -1;';

                // Create sticker element with inline styles
                container.innerHTML = `
                    <div id="sticker-${i}" style="width: 400px; background: white; border: 2px solid #333; border-radius: 12px; overflow: hidden; font-family: Arial, sans-serif;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr;">
                            <div style="border-right: 2px solid #d1d5db;">
                                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 12px; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; letter-spacing: 3px;">OWWA</div>
                                    <div style="font-size: 16px; font-weight: bold;">PROPERTY</div>
                                    <div style="font-size: 12px; opacity: 0.9;">Scan the QR Code</div>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: center; padding: 16px; position: relative; background: white;">
                                    <img src="${qrDataUrl}" alt="QR Code" style="width: 128px; height: 128px;" crossorigin="anonymous" />
                                    <div style="position: absolute; background: white; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 4px;">
                                        <img src="/DMW1.png" alt="OWWA Logo" style="width: 100%; height: 100%; object-fit: contain;" crossorigin="anonymous" />
                                    </div>
                                </div>
                                <div style="border-top: 2px solid #d1d5db; padding: 8px; text-align: center; background: white;">
                                    <div style="font-size: 10px; color: #6b7280;">Property No</div>
                                    <div style="font-size: 12px; font-weight: bold; word-break: break-all; color: black;">${item.property_number || item.unique_id}</div>
                                </div>
                            </div>
                            <div style="padding: 12px; font-size: 12px; background: white; color: black;">
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Description:</span>
                                    <span style="flex: 1; color: black;">${item.name}</span>
                                </div>
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Model No:</span>
                                    <span style="flex: 1; color: black;">${item.serial_number || 'N/A'}</span>
                                </div>
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Serial No:</span>
                                    <span style="flex: 1; color: black;">${item.serial_number || 'N/A'}</span>
                                </div>
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Acq. Date:</span>
                                    <span style="flex: 1; color: black;">${formatDate(item.acquisition_date)}</span>
                                </div>
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Acq. Cost:</span>
                                    <span style="flex: 1; color: black;">${formatCurrency(item.acquisition_cost)}</span>
                                </div>
                                <div style="display: flex; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
                                    <span style="font-weight: bold; width: 96px; color: black;">Accountable:</span>
                                    <span style="flex: 1; color: black;">${item.end_user || 'N/A'}</span>
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: bold; color: black;">Signature:</span>
                                    <div style="border-bottom: 1px solid #333; margin-top: 16px;"></div>
                                </div>
                            </div>
                        </div>
                        <div style="border-top: 2px solid #d1d5db; background: #fef2f2; padding: 8px; text-align: center;">
                            <span style="color: #dc2626; font-weight: bold; letter-spacing: 3px; font-size: 14px;">DO NOT REMOVE</span>
                        </div>
                    </div>
                `;

                document.body.appendChild(container);

                // Wait for images to load
                await new Promise(resolve => setTimeout(resolve, 100));

                const stickerEl = container.querySelector(`#sticker-${i}`) as HTMLElement;

                // Capture as canvas
                const canvas = await html2canvas(stickerEl, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                });

                // Convert to blob
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((b) => {
                        if (b) resolve(b);
                        else reject(new Error('Failed to create blob'));
                    }, 'image/png', 1.0);
                });

                // Add to zip
                const filename = `sticker-${(item.property_number || item.unique_id).replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
                zip.file(filename, blob);

                // Clean up
                document.body.removeChild(container);

                setProgress(Math.round(((i + 1) / stickersData.length) * 100));
            }

            // Generate and download zip
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `property-stickers-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            onClose();
        } catch (err) {
            console.error('Error generating stickers:', err);
            alert('Error generating stickers: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-medium mb-2">Generating QR Codes...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{progress}% complete ({stickersData.length} of {items.length})</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'print') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-medium">Opening print dialog...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{items.length} stickers ready</p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Download mode UI
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Bulk Download Stickers</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {items.length} stickers will be downloaded as a ZIP file containing individual PNG images.
                </p>

                {isProcessing ? (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-900 dark:text-white font-medium mb-2">Generating stickers...</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{downloadIndex} of {stickersData.length} ({progress}%)</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <button
                            onClick={() => {
                                isCancelledRef.current = true;
                                setIsProcessing(false);
                                onClose();
                            }}
                            className="mt-6 px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                        >
                            Cancel Download
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={handleBulkDownload}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Download ZIP
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

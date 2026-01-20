'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScannedRef = useRef<string>('');
    const mountedRef = useRef(true);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) { // SCANNING state
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.log('Scanner cleanup:', e);
            }
            scannerRef.current = null;
        }
        if (mountedRef.current) {
            setIsScanning(false);
        }
    }, []);

    const startScanner = useCallback(async () => {
        // Wait for DOM element to be ready
        const container = document.getElementById('qr-reader');
        if (!container) {
            console.log('Container not found, retrying...');
            setTimeout(startScanner, 100);
            return;
        }

        try {
            setError(null);

            // Clean up any existing scanner first
            await stopScanner();

            // Check for camera permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            stream.getTracks().forEach(track => track.stop());

            if (!mountedRef.current) return;
            setHasPermission(true);

            // Create new scanner instance
            const scanner = new Html5Qrcode('qr-reader', {
                verbose: false,
                formatsToSupport: undefined
            });
            scannerRef.current = scanner;

            // Get available cameras
            const cameras = await Html5Qrcode.getCameras();
            if (cameras.length === 0) {
                throw new Error('No cameras found');
            }

            // Prefer back camera
            const backCamera = cameras.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            const cameraId = backCamera?.id || cameras[0].id;

            await scanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    // Prevent duplicate scans
                    if (decodedText !== lastScannedRef.current) {
                        lastScannedRef.current = decodedText;
                        onScan(decodedText);

                        // Reset after 3 seconds to allow re-scanning same code
                        setTimeout(() => {
                            lastScannedRef.current = '';
                        }, 3000);
                    }
                },
                () => {
                    // Ignore scanning errors (happens when no QR code is in view)
                }
            );

            if (mountedRef.current) {
                setIsScanning(true);
            }
        } catch (err) {
            console.error('Scanner error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
            if (mountedRef.current) {
                setError(errorMessage);
                setHasPermission(false);
            }
            onError?.(errorMessage);
        }
    }, [onScan, onError, stopScanner]);

    useEffect(() => {
        mountedRef.current = true;

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        return () => {
            mountedRef.current = false;
            clearTimeout(timer);
            stopScanner();
        };
    }, []);

    const handleRetry = () => {
        setError(null);
        startScanner();
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="relative rounded-2xl overflow-hidden bg-surface shadow-xl border border-border">
                {/* Scanner Container */}
                <div
                    id="qr-reader"
                    className="w-full aspect-square bg-black"
                    style={{ minHeight: '300px' }}
                />

                {/* Scanning Overlay */}
                {isScanning && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                                {/* Corner markers */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

                                {/* Scanning line animation */}
                                <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Indicator */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md ${isScanning
                        ? 'bg-status-in-stock/20 text-status-in-stock'
                        : 'bg-surface/80 text-muted'
                        }`}>
                        {isScanning ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-status-in-stock animate-pulse" />
                                Scanning...
                            </span>
                        ) : error ? (
                            'Camera error'
                        ) : (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                                Starting camera...
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-medium">Camera access error</p>
                            <p className="mt-1 text-danger/80">{error}</p>
                            <button
                                onClick={handleRetry}
                                className="mt-3 px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger-hover transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Request */}
            {hasPermission === false && !error && (
                <div className="mt-4 p-4 rounded-lg bg-status-checked-out/10 border border-status-checked-out/20 text-status-checked-out text-sm">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <div>
                            <p className="font-medium">Camera permission required</p>
                            <p className="mt-1 opacity-80">Please allow camera access to scan QR codes.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for scanning animation */}
            <style jsx global>{`
                @keyframes scan {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(230px);
                    }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
                
                /* Style the video element from html5-qrcode */
                #qr-reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 0 !important;
                }
                
                /* Hide unnecessary UI from the library */
                #qr-reader img,
                #qr-reader__scan_region > br,
                #qr-reader__dashboard,
                #qr-reader__status_span,
                #qr-reader__header_message {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}

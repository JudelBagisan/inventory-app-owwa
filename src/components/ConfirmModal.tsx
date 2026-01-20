'use client';

import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            modalRef.current?.focus();
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'text-danger',
            iconBg: 'bg-danger/10',
            button: 'bg-danger hover:bg-danger/90',
        },
        warning: {
            icon: 'text-status-checked-out',
            iconBg: 'bg-status-checked-out/10',
            button: 'bg-status-checked-out hover:bg-status-checked-out/90',
        },
        info: {
            icon: 'text-primary',
            iconBg: 'bg-primary/10',
            button: 'bg-primary hover:bg-primary-hover',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            <div
                ref={modalRef}
                tabIndex={-1}
                className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-scale-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
                        <AlertTriangleIcon className={`w-6 h-6 ${styles.icon}`} />
                    </div>

                    {/* Title */}
                    <h3 id="modal-title" className="text-xl font-bold text-foreground text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-muted text-center">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 bg-surface-hover border-t border-border">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 rounded-lg text-white font-medium transition-colors ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { 
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}

function AlertTriangleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

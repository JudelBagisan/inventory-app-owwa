'use client';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export function InputModal({
    isOpen,
    title,
    placeholder,
    value,
    onChange,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
}: InputModalProps) {
    if (!isOpen) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && value.trim()) {
            onConfirm();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-xl font-bold text-foreground">{title}</h3>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-surface-hover flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!value.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

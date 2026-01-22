import { ItemStatus } from '@/lib/types';

interface StatusBadgeProps {
    status: ItemStatus;
    size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ItemStatus, { bg: string; text: string; dot: string }> = {
    'Brand New': {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600',
        dot: 'bg-emerald-500',
    },
    'Good': {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600',
        dot: 'bg-blue-500',
    },
    'Serviceable': {
        bg: 'bg-teal-500/10',
        text: 'text-teal-600',
        dot: 'bg-teal-500',
    },
    'Unserviceable': {
        bg: 'bg-red-500/10',
        text: 'text-red-600',
        dot: 'bg-red-500',
    },
    'Repair Needed': {
        bg: 'bg-orange-500/10',
        text: 'text-orange-600',
        dot: 'bg-orange-500',
    },
    'Donated': {
        bg: 'bg-purple-500/10',
        text: 'text-purple-600',
        dot: 'bg-purple-500',
    },
    'For Disposal': {
        bg: 'bg-gray-500/10',
        text: 'text-gray-600',
        dot: 'bg-gray-500',
    },
    'Disposable': {
        bg: 'bg-slate-500/10',
        text: 'text-slate-600',
        dot: 'bg-slate-500',
    },
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
};

const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig['Serviceable'];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]}`}
        >
            <span className={`${dotSizes[size]} rounded-full ${config.dot} animate-pulse`} />
            {status}
        </span>
    );
}

// Simple status dot indicator
export function StatusDot({ status, size = 'md' }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig['Serviceable'];

    return (
        <span
            className={`inline-block rounded-full ${config.dot} ${dotSizes[size]}`}
            title={status}
        />
    );
}


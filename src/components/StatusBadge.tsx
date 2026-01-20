import { ItemStatus } from '@/lib/types';

interface StatusBadgeProps {
    status: ItemStatus;
    size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ItemStatus, { bg: string; text: string; dot: string }> = {
    'In Stock': {
        bg: 'bg-status-in-stock/10',
        text: 'text-status-in-stock',
        dot: 'bg-status-in-stock',
    },
    'Checked Out': {
        bg: 'bg-status-checked-out/10',
        text: 'text-status-checked-out',
        dot: 'bg-status-checked-out',
    },
    'Maintenance': {
        bg: 'bg-status-maintenance/10',
        text: 'text-status-maintenance',
        dot: 'bg-status-maintenance',
    },
    'Disposed': {
        bg: 'bg-status-disposed/10',
        text: 'text-status-disposed',
        dot: 'bg-status-disposed',
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
    const config = statusConfig[status];

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
    const config = statusConfig[status];

    return (
        <span
            className={`inline-block rounded-full ${config.dot} ${dotSizes[size]}`}
            title={status}
        />
    );
}

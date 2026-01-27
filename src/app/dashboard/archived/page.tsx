'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Item } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/ToastProvider';

interface ArchivedItem extends Item {
    archived_at: string;
    archived_by: string;
    auto_delete_at: string;
}

export default function ArchivedItemsPage() {
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();

    const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchArchivedItems();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
        }
    };

    const fetchArchivedItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('archived_items')
                .select('*')
                .order('archived_at', { ascending: false });

            if (error) throw error;
            setArchivedItems(data || []);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to fetch archived items', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedItem) return;

        try {
            const { error } = await supabase.rpc('restore_archived_item', {
                item_id: selectedItem.id
            });

            if (error) throw error;

            showToast('Item restored successfully', 'success');
            await fetchArchivedItems();
            setShowRestoreModal(false);
            setSelectedItem(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to restore item', 'error');
        }
    };

    const handlePermanentDelete = async () => {
        if (!selectedItem) return;

        try {
            const { error } = await supabase
                .from('archived_items')
                .delete()
                .eq('id', selectedItem.id);

            if (error) throw error;

            showToast('Item permanently deleted', 'success');
            await fetchArchivedItems();
            setShowDeleteModal(false);
            setSelectedItem(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
        }
    };

    const getDaysUntilDeletion = (autoDeleteAt: string): number => {
        const now = new Date();
        const deleteDate = new Date(autoDeleteAt);
        const diffTime = deleteDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const filteredItems = archivedItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unique_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Archived Items</h1>
                        <p className="text-muted mt-2">Items that have been deleted are stored here for 30 days before permanent deletion</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface-hover transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search archived items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-10 rounded-lg bg-surface border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface rounded-xl border border-border p-4">
                        <div className="text-2xl font-bold text-foreground">{archivedItems.length}</div>
                        <div className="text-sm text-muted">Total Archived Items</div>
                    </div>
                    <div className="bg-surface rounded-xl border border-border p-4">
                        <div className="text-2xl font-bold text-amber-600">
                            {archivedItems.filter(item => getDaysUntilDeletion(item.auto_delete_at) <= 7).length}
                        </div>
                        <div className="text-sm text-muted">Expiring Soon (≤7 days)</div>
                    </div>
                    <div className="bg-surface rounded-xl border border-border p-4">
                        <div className="text-2xl font-bold text-red-600">
                            {archivedItems.filter(item => getDaysUntilDeletion(item.auto_delete_at) === 0).length}
                        </div>
                        <div className="text-sm text-muted">Expiring Today</div>
                    </div>
                </div>

                {/* Items List */}
                <div className="bg-surface rounded-xl border border-border">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted">Loading archived items...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-12 text-center">
                            <ArchiveIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No Archived Items</h3>
                            <p className="text-muted">
                                {searchQuery ? 'No items match your search.' : 'Items that are deleted will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredItems.map((item) => {
                                const daysLeft = getDaysUntilDeletion(item.auto_delete_at);
                                return (
                                    <div key={item.id} className="p-4 hover:bg-surface-hover transition-colors">
                                        <div className="flex items-start gap-4">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-20 h-20 rounded-lg object-cover border border-border"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
                                                    <ImageIcon className="w-10 h-10 text-muted" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="font-semibold text-foreground text-lg">{item.name}</h3>
                                                        <p className="text-sm text-muted mt-1">ID: {item.unique_id}</p>
                                                        {item.description && (
                                                            <p className="text-sm text-muted mt-1">{item.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                                                                {item.category}
                                                            </span>
                                                            <StatusBadge status={item.status} size="sm" />
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-sm font-medium ${
                                                            daysLeft <= 3 ? 'text-red-600' :
                                                            daysLeft <= 7 ? 'text-amber-600' :
                                                            'text-muted'
                                                        }`}>
                                                            {daysLeft === 0 ? 'Expires today' :
                                                             daysLeft === 1 ? '1 day left' :
                                                             `${daysLeft} days left`}
                                                        </div>
                                                        <div className="text-xs text-muted mt-1">
                                                            Archived {new Date(item.archived_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setShowRestoreModal(true);
                                                        }}
                                                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <RestoreIcon className="w-4 h-4" />
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                        Delete Permanently
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Restore Confirmation Modal */}
            <ConfirmModal
                isOpen={showRestoreModal}
                title="Restore Item"
                message={`Are you sure you want to restore "${selectedItem?.name}"? It will be moved back to your active inventory.`}
                confirmText="Restore"
                variant="info"
                onConfirm={handleRestore}
                onCancel={() => {
                    setShowRestoreModal(false);
                    setSelectedItem(null);
                }}
            />

            {/* Permanent Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Permanently Delete Item"
                message={`Are you sure you want to permanently delete "${selectedItem?.name}"? This action cannot be undone.`}
                confirmText="Delete Permanently"
                variant="danger"
                onConfirm={handlePermanentDelete}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                }}
            />
        </div>
    );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function ArchiveIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function RestoreIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

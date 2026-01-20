'use client';

import { useState, useEffect } from 'react';
import { Item, ItemFormData, ITEM_STATUSES, ItemStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { QRGeneratorMini } from '@/components/QRGenerator';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ItemStatus | 'All'>('All');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        filterItems();
    }, [items, searchQuery, statusFilter]);

    const fetchItems = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch items');
        } finally {
            setIsLoading(false);
        }
    };

    const filterItems = () => {
        let filtered = items;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.unique_id.toLowerCase().includes(query) ||
                    item.serial_number?.toLowerCase().includes(query) ||
                    item.property_number?.toLowerCase().includes(query) ||
                    item.end_user?.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query) ||
                    item.owner?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter !== 'All') {
            filtered = filtered.filter((item) => item.status === statusFilter);
        }

        setFilteredItems(filtered);
    };

    const handleSaveItem = async (data: ItemFormData) => {
        const isNew = showAddForm;

        try {
            if (isNew) {
                const { error } = await supabase.from('items').insert([data]);
                if (error) throw error;
            } else if (selectedItem) {
                const { error } = await supabase
                    .from('items')
                    .update(data)
                    .eq('id', selectedItem.id);
                if (error) throw error;
            }

            await fetchItems();
            setSelectedItem(null);
            setShowAddForm(false);
        } catch (err) {
            throw err;
        }
    };

    const handleDeleteItem = async () => {
        if (!selectedItem) return;

        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', selectedItem.id);

            if (error) throw error;

            await fetchItems();
            setSelectedItem(null);
        } catch (err) {
            throw err;
        }
    };

    const getStatusCount = (status: ItemStatus) => {
        return items.filter((item) => item.status === status).length;
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return '-';
        return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="container mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Inventory Dashboard</h1>
                    <p className="text-muted mt-1">Manage your inventory items</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add New Item
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {ITEM_STATUSES.map((status) => (
                    <div
                        key={status}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === status
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border bg-surface hover:border-primary/50'
                            }`}
                        onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
                    >
                        <StatusBadge status={status} size="sm" />
                        <p className="text-2xl font-bold text-foreground mt-2">
                            {getStatusCount(status)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, serial number, property number, end user..."
                        className="w-full pl-12 pr-4 py-3 rounded-lg bg-surface border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ItemStatus | 'All')}
                    className="px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                    <option value="All">All Status ({items.length})</option>
                    {ITEM_STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status} ({getStatusCount(status)})
                        </option>
                    ))}
                </select>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
                    {error}
                    <button
                        onClick={fetchItems}
                        className="ml-4 underline hover:no-underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Items Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-xl border border-border">
                    <BoxIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-xl font-medium text-foreground">No items found</p>
                    <p className="text-muted mt-2">
                        {searchQuery || statusFilter !== 'All'
                            ? 'Try adjusting your search or filters'
                            : 'Add your first item to get started'}
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-hover border-b border-border">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Image</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Item Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Serial No.</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Acq. Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Acq. Cost</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Location</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">End User</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                        <td className="px-3 py-3">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-12 h-12 rounded-lg object-cover border border-border"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
                                                    <ImageIcon className="w-6 h-6 text-muted" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div>
                                                <p className="font-medium text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted truncate max-w-[200px]">{item.description || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm font-mono text-foreground">{item.serial_number || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm text-foreground">{formatDate(item.acquisition_date)}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm font-medium text-foreground">{formatCurrency(item.acquisition_cost)}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                                {item.location || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm text-foreground">{item.end_user || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={item.status} size="sm" />
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden divide-y divide-border">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 hover:bg-surface-hover transition-colors cursor-pointer"
                                onClick={() => setSelectedItem(item)}
                            >
                                <div className="flex items-start gap-4">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-surface-hover border border-border flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-8 h-8 text-muted" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium text-foreground">{item.name}</p>
                                                <p className="text-sm text-muted line-clamp-1">{item.description || '-'}</p>
                                            </div>
                                            <StatusBadge status={item.status} size="sm" />
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted">Serial: </span>
                                                <span className="text-foreground font-mono">{item.serial_number || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Location: </span>
                                                <span className="text-primary font-medium">{item.location || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">End User: </span>
                                                <span className="text-foreground">{item.end_user || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Cost: </span>
                                                <span className="text-foreground font-medium">{formatCurrency(item.acquisition_cost)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-muted flex-shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Edit/Add */}
            {(selectedItem || showAddForm) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <InventoryItemForm
                            item={selectedItem}
                            isEditable={true}
                            isNew={showAddForm}
                            onSave={handleSaveItem}
                            onDelete={selectedItem ? handleDeleteItem : undefined}
                            onClose={() => {
                                setSelectedItem(null);
                                setShowAddForm(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function BoxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    );
}

function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

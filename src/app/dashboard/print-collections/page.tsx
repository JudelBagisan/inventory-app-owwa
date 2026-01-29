'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PrintCollection, CollectionSummary, Item, ItemCategory, ItemFormData } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { InputModal } from '@/components/InputModal';
import { BulkStickerGenerator } from '@/components/BulkStickerGenerator';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { useToast } from '@/components/ToastProvider';

export default function PrintCollectionsPage() {
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();
    
    const [collections, setCollections] = useState<CollectionSummary[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<PrintCollection | null>(null);
    const [collectionItems, setCollectionItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'All'>('All');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showInputModal, setShowInputModal] = useState<'create' | 'rename' | null>(null);
    const [collectionName, setCollectionName] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [itemCopies, setItemCopies] = useState<Map<string, number>>(new Map());
    const [bulkMode, setBulkMode] = useState<'download' | 'print' | null>(null);
    const [viewItem, setViewItem] = useState<Item | null>(null);

    useEffect(() => {
        checkAuth();
        loadCollections();
    }, []);

    useEffect(() => {
        if (selectedCollection) {
            loadCollectionItems(selectedCollection.id);
        }
    }, [selectedCollection]);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
        }
    };

    const loadCollections = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('print_collections')
            .select(`
                *,
                collection_items(count)
            `)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading collections:', error);
        } else {
            const formattedData: CollectionSummary[] = data.map((col: any) => ({
                id: col.id,
                name: col.name,
                created_by: col.created_by,
                created_at: col.created_at,
                updated_at: col.updated_at,
                item_count: col.collection_items[0]?.count || 0
            }));
            setCollections(formattedData);
        }
        setLoading(false);
    };

    const loadCollectionItems = async (collectionId: string) => {
        const { data, error } = await supabase
            .from('collection_items')
            .select(`
                item_id,
                items(*)
            `)
            .eq('collection_id', collectionId);

        if (error) {
            console.error('Error loading collection items:', error);
        } else {
            const items = data.map((ci: any) => ci.items).filter(Boolean);
            setCollectionItems(items);
        }
        setSelectedItems(new Set());
    };

    const createCollection = async () => {
        if (!collectionName.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('print_collections')
            .insert({ name: collectionName, created_by: user.id })
            .select()
            .single();

        if (error) {
            console.error('Error creating collection:', error);
            showToast('Failed to create collection', 'error');
        } else {
            await loadCollections();
            setShowInputModal(null);
            setCollectionName('');
            showToast('Collection created successfully', 'success');
            if (data) {
                setSelectedCollection(data);
            }
        }
    };

    const renameCollection = async () => {
        if (!selectedCollection || !collectionName.trim()) return;

        const { error } = await supabase
            .from('print_collections')
            .update({ name: collectionName })
            .eq('id', selectedCollection.id);

        if (error) {
            console.error('Error renaming collection:', error);
            showToast('Failed to rename collection', 'error');
        } else {
            await loadCollections();
            setSelectedCollection({ ...selectedCollection, name: collectionName });
            setShowInputModal(null);
            setCollectionName('');
            showToast('Collection renamed successfully', 'success');
        }
    };

    const deleteCollection = async () => {
        if (!selectedCollection) return;

        const { error } = await supabase
            .from('print_collections')
            .delete()
            .eq('id', selectedCollection.id);

        if (error) {
            console.error('Error deleting collection:', error);
            showToast('Failed to delete collection', 'error');
        } else {
            setCollections(collections.filter(c => c.id !== selectedCollection.id));
            setSelectedCollection(null);
            setCollectionItems([]);
            setShowDeleteModal(false);
            showToast('Collection deleted successfully', 'success');
        }
    };

    const removeSelectedItems = async () => {
        if (!selectedCollection || selectedItems.size === 0) return;

        const itemsToRemove = Array.from(selectedItems);
        const { error } = await supabase
            .from('collection_items')
            .delete()
            .eq('collection_id', selectedCollection.id)
            .in('item_id', itemsToRemove);

        if (error) {
            console.error('Error removing items:', error);
            showToast('Failed to remove items', 'error');
        } else {
            await loadCollectionItems(selectedCollection.id);
            await loadCollections();
            showToast(`Successfully removed ${itemsToRemove.length} item(s)`, 'success');
        }
    };

    const getSelectedItems = (): Item[] => {
        const items: Item[] = [];
        collectionItems.forEach(item => {
            if (selectedItems.has(item.id)) {
                const copies = itemCopies.get(item.id) || 1;
                for (let i = 0; i < copies; i++) {
                    items.push(item);
                }
            }
        });
        return items;
    };

    const updateItemCopies = (itemId: string, copies: number) => {
        const newCopies = new Map(itemCopies);
        if (copies <= 0) {
            newCopies.delete(itemId);
        } else {
            newCopies.set(itemId, Math.min(copies, 99)); // Max 99 copies
        }
        setItemCopies(newCopies);
    };

    const getTotalCopies = (): number => {
        let total = 0;
        selectedItems.forEach(itemId => {
            total += itemCopies.get(itemId) || 1;
        });
        return total;
    };

    const handleSaveItem = async (data: ItemFormData) => {
        if (!viewItem) return;
        
        try {
            const { error } = await supabase
                .from('items')
                .update(data)
                .eq('id', viewItem.id);
            
            if (error) throw error;
            
            showToast('Item updated successfully', 'success');
            await loadCollectionItems(selectedCollection!.id);
            setViewItem(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update item', 'error');
            throw err;
        }
    };

    const handleDeleteItem = async () => {
        if (!viewItem) return;
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Call the archive_item function
            const { error } = await supabase.rpc('archive_item', {
                item_id: viewItem.id,
                user_id: user.id
            });
            
            if (error) throw error;
            
            showToast('Item archived successfully', 'success');
            await loadCollectionItems(selectedCollection!.id);
            await loadCollections();
            setViewItem(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to archive item', 'error');
            throw err;
        }
    };

    const downloadAllStickers = () => {
        if (selectedItems.size === 0) return;
        setBulkMode('download');
    };

    const printAllLabels = () => {
        if (selectedItems.size === 0) return;
        setBulkMode('print');
    };

    const toggleItemSelection = (itemId: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    };

    const filteredItems = collectionItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.unique_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Print Collections</h1>
                    <p className="text-muted mt-2">Organize items into collections for batch printing and exporting</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Collections List */}
                    <div className="lg:col-span-1">
                        <div className="bg-surface rounded-xl border border-border p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-foreground">Collections</h2>
                                <button
                                    onClick={() => {
                                        setCollectionName('');
                                        setShowInputModal('create');
                                    }}
                                    className="p-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors"
                                    title="Create New Collection"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {loading ? (
                                <p className="text-muted text-sm">Loading...</p>
                            ) : collections.length === 0 ? (
                                <p className="text-muted text-sm">No collections yet. Create one to get started!</p>
                            ) : (
                                <div className="space-y-2">
                                    {collections.map((collection) => (
                                        <div
                                            key={collection.id}
                                            onClick={() => setSelectedCollection(collection)}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                selectedCollection?.id === collection.id
                                                    ? 'bg-primary text-white'
                                                    : 'bg-surface-hover hover:bg-border'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium truncate ${
                                                        selectedCollection?.id === collection.id ? 'text-white' : 'text-foreground'
                                                    }`}>
                                                        {collection.name}
                                                    </p>
                                                    <p className={`text-xs mt-1 ${
                                                        selectedCollection?.id === collection.id ? 'text-white/70' : 'text-muted'
                                                    }`}>
                                                        {collection.item_count} items
                                                    </p>
                                                    <p className={`text-xs ${
                                                        selectedCollection?.id === collection.id ? 'text-white/60' : 'text-muted'
                                                    }`}>
                                                        {new Date(collection.updated_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <FolderIcon className={`w-5 h-5 flex-shrink-0 ${
                                                    selectedCollection?.id === collection.id ? 'text-white' : 'text-primary'
                                                }`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content - Collection Items */}
                    <div className="lg:col-span-3">
                        {selectedCollection ? (
                            <div className="bg-surface rounded-xl border border-border">
                                {/* Collection Header */}
                                <div className="p-6 border-b border-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-bold text-foreground">{selectedCollection.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setCollectionName(selectedCollection.name);
                                                    setShowInputModal('rename');
                                                }}
                                                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface-hover transition-colors"
                                            >
                                                Rename
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                className="px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger-hover transition-colors"
                                            >
                                                Delete Collection
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search and Filters */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Search items in this collection..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full px-4 py-2 pl-10 rounded-lg bg-background border border-border text-foreground"
                                            />
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                                        </div>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value as ItemCategory | 'All')}
                                            className="px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                                        >
                                            <option value="All">All Categories</option>
                                            <option value="Furniture and Fixtures">Furniture & Fixtures</option>
                                            <option value="ICT Equipments">ICT Equipments</option>
                                            <option value="Other Equipments">Other Equipments</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {collectionItems.length > 0 && (
                                    <div className="px-6 py-4 bg-surface-hover border-b border-border flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface transition-colors text-sm"
                                        >
                                            {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        {selectedItems.size > 0 && (
                                            <>
                                                <button
                                                    onClick={removeSelectedItems}
                                                    className="px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger-hover transition-colors text-sm"
                                                >
                                                    Remove Selected ({selectedItems.size})
                                                </button>
                                                <button
                                                    onClick={downloadAllStickers}
                                                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm flex items-center gap-2"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                    Download Stickers
                                                </button>
                                                <button
                                                    onClick={printAllLabels}
                                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm flex items-center gap-2"
                                                >
                                                    <PrintIcon className="w-4 h-4" />
                                                    Print Stickers ({getTotalCopies()} {getTotalCopies() !== selectedItems.size ? `from ${selectedItems.size}` : ''})
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Items List */}
                                <div className="p-6">
                                    {collectionItems.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FolderIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                                            <p className="text-muted">This collection is empty</p>
                                            <p className="text-muted text-sm mt-2">Add items from the main inventory dashboard</p>
                                        </div>
                                    ) : filteredItems.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-muted">No items match your search</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {filteredItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(item.id)}
                                                            onChange={() => toggleItemSelection(item.id)}
                                                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                                                        />
                                                        {selectedItems.has(item.id) && (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <label className="text-xs text-muted whitespace-nowrap">Copies</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="99"
                                                                    value={itemCopies.get(item.id) || 1}
                                                                    onChange={(e) => updateItemCopies(item.id, parseInt(e.target.value) || 1)}
                                                                    className="w-16 px-2 py-1 text-center rounded border border-border bg-background text-foreground text-sm"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            className="w-16 h-16 rounded-lg object-cover border border-border"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
                                                            <ImageIcon className="w-8 h-8 text-muted" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="font-medium text-foreground">{item.name}</h3>
                                                        <p className="text-sm text-muted">ID: {item.unique_id}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                                {item.category === 'Furniture and Fixtures' ? 'Furniture' :
                                                                 item.category === 'ICT Equipments' ? 'ICT' : 'Others'}
                                                            </span>
                                                            <StatusBadge status={item.status} size="sm" />
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-2">
                                                        <div>
                                                            <p className="text-sm text-muted">{item.location}</p>
                                                            <p className="text-sm text-muted">{item.end_user}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setViewItem(item)}
                                                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface rounded-xl border border-border p-12 text-center">
                                <FolderIcon className="w-20 h-20 text-muted mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-foreground mb-2">No Collection Selected</h3>
                                <p className="text-muted">Select a collection from the sidebar or create a new one</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Modal for Create/Rename */}
            <InputModal
                isOpen={showInputModal !== null}
                title={showInputModal === 'create' ? 'Create New Collection' : 'Rename Collection'}
                placeholder={showInputModal === 'create' ? 'Collection name...' : 'New collection name...'}
                value={collectionName}
                onChange={setCollectionName}
                onConfirm={() => {
                    if (showInputModal === 'create') {
                        createCollection();
                    } else if (showInputModal === 'rename') {
                        renameCollection();
                    }
                }}
                onCancel={() => {
                    setShowInputModal(null);
                    setCollectionName('');
                }}
                confirmText={showInputModal === 'create' ? 'Create' : 'Rename'}
            />

            {/* Delete Collection Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Collection"
                message={`Are you sure you want to delete "${selectedCollection?.name}"? This will not delete the items from your inventory.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={deleteCollection}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Bulk Sticker Generator Modal */}
            {bulkMode && (
                <BulkStickerGenerator
                    items={getSelectedItems()}
                    mode={bulkMode}
                    onClose={() => {
                        setBulkMode(null);
                        setSelectedItems(new Set());
                    }}
                />
            )}

            {/* Item View/Edit Modal */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <InventoryItemForm
                            item={viewItem}
                            isEditable={true}
                            isNew={false}
                            onSave={handleSaveItem}
                            onDelete={handleDeleteItem}
                            onClose={() => setViewItem(null)}
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

function FolderIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

function PrintIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
    );
}

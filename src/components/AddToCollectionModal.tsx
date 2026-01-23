'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PrintCollection, CollectionSummary } from '@/lib/types';
import { useToast } from './ToastProvider';

interface AddToCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItemIds: string[];
    onSuccess?: () => void;
}

export function AddToCollectionModal({ isOpen, onClose, selectedItemIds, onSuccess }: AddToCollectionModalProps) {
    const supabase = createClient();
    const { showToast } = useToast();
    const [collections, setCollections] = useState<CollectionSummary[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [createNew, setCreateNew] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadCollections();
        }
    }, [isOpen]);

    const loadCollections = async () => {
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
    };

    const handleSubmit = async () => {
        if (!createNew && !selectedCollectionId) {
            setError('Please select a collection');
            return;
        }

        if (createNew && !newCollectionName.trim()) {
            setError('Please enter a collection name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let collectionId = selectedCollectionId;

            // Create new collection if needed
            if (createNew) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setError('You must be logged in');
                    setLoading(false);
                    return;
                }

                const { data: newCollection, error: createError } = await supabase
                    .from('print_collections')
                    .insert({ name: newCollectionName, created_by: user.id })
                    .select()
                    .single();

                if (createError) {
                    throw createError;
                }

                collectionId = newCollection.id;
            }

            // Add items to collection
            const itemsToAdd = selectedItemIds.map(itemId => ({
                collection_id: collectionId,
                item_id: itemId
            }));

            const { error: insertError } = await supabase
                .from('collection_items')
                .insert(itemsToAdd);

            if (insertError) {
                // If error is due to duplicates, that's okay - just skip those
                if (!insertError.message.includes('duplicate')) {
                    throw insertError;
                }
            }

            // Success!
            showToast(`Successfully added ${selectedItemIds.length} item(s) to collection`, 'success');
            onSuccess?.();
            handleClose();
        } catch (err: any) {
            console.error('Error adding items to collection:', err);
            setError(err.message || 'Failed to add items to collection');
            showToast(err.message || 'Failed to add items to collection', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCreateNew(false);
        setNewCollectionName('');
        setSelectedCollectionId('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">Add to Collection</h3>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                            aria-label="Close"
                        >
                            <CloseIcon className="w-5 h-5 text-muted" />
                        </button>
                    </div>
                    <p className="text-sm text-muted mt-1">
                        Adding {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                            {error}
                        </div>
                    )}

                    {/* Toggle between existing and new */}
                    <div className="flex gap-2 p-1 bg-surface-hover rounded-lg">
                        <button
                            onClick={() => setCreateNew(false)}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                !createNew
                                    ? 'bg-primary text-white'
                                    : 'text-muted hover:text-foreground'
                            }`}
                        >
                            Existing Collection
                        </button>
                        <button
                            onClick={() => setCreateNew(true)}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                createNew
                                    ? 'bg-primary text-white'
                                    : 'text-muted hover:text-foreground'
                            }`}
                        >
                            Create New
                        </button>
                    </div>

                    {/* Existing collection selector */}
                    {!createNew && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Select Collection
                            </label>
                            {collections.length === 0 ? (
                                <p className="text-sm text-muted p-4 text-center bg-surface-hover rounded-lg">
                                    No collections yet. Create a new one!
                                </p>
                            ) : (
                                <select
                                    value={selectedCollectionId}
                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Choose a collection...</option>
                                    {collections.map((collection) => (
                                        <option key={collection.id} value={collection.id}>
                                            {collection.name} ({collection.item_count} items)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* New collection name input */}
                    {createNew && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Collection Name
                            </label>
                            <input
                                type="text"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="e.g., Monday Batch, ICT Room Labels"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-surface-hover flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!createNew && !selectedCollectionId) || (createNew && !newCollectionName.trim())}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <LoadingSpinner />
                                Adding...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-4 h-4" />
                                Add to Collection
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Icons
function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}

function LoadingSpinner() {
    return (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}

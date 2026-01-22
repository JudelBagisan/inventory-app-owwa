'use client';

import { useState, useEffect } from 'react';
import { Location } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface LocationManagerProps {
    onClose: () => void;
}

export function LocationManager({ onClose }: LocationManagerProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [newLocationName, setNewLocationName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setLocations(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch locations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newLocationName.trim()) {
            setError('Location name is required');
            return;
        }

        try {
            setError(null);
            setSuccessMessage(null);

            const { error } = await supabase
                .from('locations')
                .insert([{ name: newLocationName.trim() }]);

            if (error) throw error;

            setSuccessMessage('Location added successfully');
            setNewLocationName('');
            await fetchLocations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add location');
        }
    };

    const handleSoftDeleteLocation = async (locationId: string) => {
        if (!confirm('Are you sure you want to delete this location? It will still remain in the system but marked as deleted.')) {
            return;
        }

        try {
            setError(null);
            setSuccessMessage(null);

            const { error } = await supabase
                .from('locations')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', locationId);

            if (error) throw error;

            setSuccessMessage('Location deleted successfully');
            await fetchLocations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete location');
        }
    };

    const handleRestoreLocation = async (locationId: string) => {
        try {
            setError(null);
            setSuccessMessage(null);

            const { error } = await supabase
                .from('locations')
                .update({ deleted_at: null })
                .eq('id', locationId);

            if (error) throw error;

            setSuccessMessage('Location restored successfully');
            await fetchLocations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to restore location');
        }
    };

    const activeLocations = locations.filter(loc => !loc.deleted_at);
    const deletedLocations = locations.filter(loc => loc.deleted_at);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Manage Locations</h2>
                        <p className="text-sm text-muted mt-1">Add or remove location options</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg hover:bg-surface-hover transition-colors flex items-center justify-center text-muted hover:text-foreground"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600">
                        {successMessage}
                    </div>
                )}

                {/* Add Location Form */}
                <div className="p-6 border-b border-border bg-surface-hover">
                    <form onSubmit={handleAddLocation} className="flex gap-3">
                        <input
                            type="text"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            placeholder="Enter new location name"
                            className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all"
                        >
                            Add Location
                        </button>
                    </form>
                </div>

                {/* Locations List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Active Locations */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3">
                                    Active Locations ({activeLocations.length})
                                </h3>
                                {activeLocations.length === 0 ? (
                                    <p className="text-muted text-sm">No active locations</p>
                                ) : (
                                    <div className="space-y-2">
                                        {activeLocations.map((location) => (
                                            <div
                                                key={location.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                                            >
                                                <span className="text-foreground font-medium">{location.name}</span>
                                                <button
                                                    onClick={() => handleSoftDeleteLocation(location.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-sm font-medium hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Deleted Locations */}
                            {deletedLocations.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-3">
                                        Deleted Locations ({deletedLocations.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {deletedLocations.map((location) => (
                                            <div
                                                key={location.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border opacity-60"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground font-medium line-through">{location.name}</span>
                                                    <span className="text-xs text-muted">
                                                        (Deleted: {new Date(location.deleted_at!).toLocaleDateString()})
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRestoreLocation(location.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium hover:bg-green-500 hover:text-white transition-all"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface-hover">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-surface transition-colors"
                    >
                        Close
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

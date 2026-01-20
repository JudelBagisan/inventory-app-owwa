'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Item, ItemFormData } from '@/lib/types';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Item | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const supabase = createClient();
    const itemId = params.id as string;

    useEffect(() => {
        checkAuth();
        fetchItem();
    }, [itemId]);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
    };

    const fetchItem = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Try to fetch by UUID first, then by unique_id
            let { data, error: err } = await supabase
                .from('items')
                .select('*')
                .eq('id', itemId)
                .single();

            if (err && err.code === 'PGRST116') {
                // Try by unique_id
                const result = await supabase
                    .from('items')
                    .select('*')
                    .eq('unique_id', itemId)
                    .single();

                data = result.data;
                err = result.error;
            }

            if (err) throw err;
            setItem(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Item not found');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (data: ItemFormData) => {
        if (!item) return;

        try {
            const { error } = await supabase
                .from('items')
                .update(data)
                .eq('id', item.id);

            if (error) throw error;

            // Refresh item
            await fetchItem();
        } catch (err) {
            throw err;
        }
    };

    const handleDelete = async () => {
        if (!item) return;

        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', item.id);

            if (error) throw error;

            router.push('/dashboard');
        } catch (err) {
            throw err;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted">Loading item...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                        <AlertIcon className="w-8 h-8 text-danger" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Item Not Found</h1>
                    <p className="text-muted mb-6">{error || 'The item you are looking for does not exist.'}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all"
                        >
                            Scan Another
                        </Link>
                        <Link
                            href="/dashboard"
                            className="px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface-hover transition-all"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
                <Link href="/" className="hover:text-primary transition-colors">
                    Home
                </Link>
                <span>/</span>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                    Dashboard
                </Link>
                <span>/</span>
                <span className="text-foreground">{item.name}</span>
            </nav>

            {/* Item Form */}
            <div className="max-w-2xl mx-auto">
                <InventoryItemForm
                    item={item}
                    isEditable={isAuthenticated}
                    onSave={isAuthenticated ? handleSave : undefined}
                    onDelete={isAuthenticated ? handleDelete : undefined}
                    onClose={() => router.back()}
                />

                {!isAuthenticated && (
                    <div className="mt-6 p-4 rounded-lg bg-status-checked-out/10 border border-status-checked-out/20 text-center">
                        <p className="text-status-checked-out font-medium">
                            Login as admin to edit this item
                        </p>
                        <Link
                            href={`/login?redirect=/item/${itemId}`}
                            className="inline-block mt-2 text-sm text-primary hover:underline"
                        >
                            Login now →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function AlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

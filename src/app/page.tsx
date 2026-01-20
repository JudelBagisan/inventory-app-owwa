'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRScanner } from '@/components/QRScanner';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { Item, ItemFormData } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function HomePage() {
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const handleScan = async (uniqueId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('unique_id', uniqueId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError(`Item not found: ${uniqueId}`);
        } else {
          throw error;
        }
        return;
      }

      setScannedItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (data: ItemFormData) => {
    if (!scannedItem) return;

    try {
      const { error } = await supabase
        .from('items')
        .update(data)
        .eq('id', scannedItem.id);

      if (error) throw error;

      // Refresh item data
      const { data: updatedItem } = await supabase
        .from('items')
        .select('*')
        .eq('id', scannedItem.id)
        .single();

      if (updatedItem) {
        setScannedItem(updatedItem);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleClose = () => {
    setScannedItem(null);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-surface to-background py-8 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Inventory Scanner
          </h1>
          <p className="text-muted max-w-md mx-auto">
            Scan a QR code to view item details. {isAuthenticated ? 'As admin, you can edit items.' : 'Login to make changes.'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto">
          {/* QR Scanner */}
          {!scannedItem && !isLoading && (
            <div className="max-w-md mx-auto">
              <QRScanner onScan={handleScan} onError={(e) => setError(e)} />

              {/* Error Message */}
              {error && (
                <div className="mt-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-center">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-md"
                  >
                    <DashboardIcon className="w-5 h-5" />
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface-hover transition-all"
                  >
                    <LoginIcon className="w-5 h-5" />
                    Admin Login
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted">Looking up item...</p>
            </div>
          )}

          {/* Scanned Item Detail */}
          {scannedItem && (
            <div className="max-w-2xl mx-auto">
              <InventoryItemForm
                item={scannedItem}
                isEditable={isAuthenticated}
                onSave={isAuthenticated ? handleSaveItem : undefined}
                onClose={handleClose}
              />

              {!isAuthenticated && (
                <div className="mt-6 p-4 rounded-lg bg-status-checked-out/10 border border-status-checked-out/20 text-center">
                  <p className="text-status-checked-out font-medium">
                    Login as admin to edit this item
                  </p>
                  <Link
                    href="/login?redirect=/"
                    className="inline-block mt-2 text-sm text-primary hover:underline"
                  >
                    Login now →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!scannedItem && !isLoading && (
        <div className="bg-surface border-t border-border py-8 px-4">
          <div className="container mx-auto">
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ScanIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">1. Scan QR Code</h3>
                <p className="text-sm text-muted mt-1">
                  Point your camera at an item's QR code
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <EyeIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">2. View Details</h3>
                <p className="text-sm text-muted mt-1">
                  See item name, quantity, status, and more
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <EditIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">3. Update (Admin)</h3>
                <p className="text-sm text-muted mt-1">
                  Admins can edit and save changes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function LoginIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">


      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2">
        {/* Logos */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Image
            src="/DMW1.png"
            alt="OWWA Logo"
            width={100}
            height={100}
            className="object-contain"
          />
        </div>

        {/* Title Section */}
        <div className="text-center mb-8">
          <p className="text-primary text-sm font-medium tracking-wide uppercase mb-2">
            OWWA REGIONAL OFFICE XI
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Inventory
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary">
            Management System
          </h2>
          <p className="text-muted mt-4 max-w-md mx-auto text-sm sm:text-base">
            QR-based inventory management system with dashboard and admin capabilities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-lg hover:shadow-xl"
          >
            <LoginIcon className="w-5 h-5" />
            Log In
          </Link>
          <Link
            href="/scanner"
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface-hover transition-all"
          >
            <ScanIcon className="w-5 h-5" />
            Scan Item
          </Link>
        </div>
      </main>

      {/* Footer */}

    </div>
  );
}

// Icons
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
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

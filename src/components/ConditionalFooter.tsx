'use client';

import { usePathname } from "next/navigation";

export function ConditionalFooter() {
  const pathname = usePathname();
  const showFooter = pathname === '/' || pathname === '/login';

  if (!showFooter) return null;

  return (
    <footer className="py-4 text-center text-sm text-muted border-border no-print">
      <div className="container mx-auto">
        <footer className="py-6 px-4 text-center border-t border-border">
          <p className="text-muted text-sm mb-2">
            ©{new Date().getFullYear()} Overseas Workers Welfare Administration Region XI
          </p>
          <p className="text-sm text-muted">
            Developed by{' '}
            <a
              href="https://judel-bagisan-portfolio.vercel.app"
              className="text-primary hover:underline font-medium"
            >
              Judel Bagisan
            </a>
            {' • '}
            <a href="https://github.com/judelbagisan" className="text-primary hover:underline">GitHub</a>
            {' • '}
            <a href="https://www.facebook.com/judelcabahug.bagisan" className="text-primary hover:underline">Facebook</a>
          </p>
        </footer>
      </div>
    </footer>
  );
}

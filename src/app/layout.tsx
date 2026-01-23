import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { NavBar } from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "QR-based inventory management system with dashboard and admin capabilities",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <ToastProvider>
            <div className="flex flex-col min-h-screen">
              <NavBar />
              <main className="flex-1">
                {children}
              </main>
            <footer className="py-4 text-center text-sm text-muted border-border no-print">
              <div className="container mx-auto">
                <footer className="py-6 px-4 text-center border-t border-border">
                  <p className="text-muted text-sm mb-2">
                    © 2026 Overseas Workers Welfare Administration Region XI
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
          </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

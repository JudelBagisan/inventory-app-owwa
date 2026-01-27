'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/dashboard';
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }

            router.push(redirect);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Card Container */}
            <div className="bg-surface rounded-2xl shadow-xl border border-border p-8">
                {/* Logos */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    <Image
                        src="/DMW1.png"
                        alt="DMW Logo"
                        width={70}
                        height={70}
                        className="object-contain"
                    />
                    <Image
                        src="/owwa.png"
                        alt="OWWA Logo"
                        width={70}
                        height={70}
                        className="object-contain"
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-foreground">OWWA RWO XI</h1>
                    <p className="text-muted text-sm mt-1">
                        Overseas Workers Welfare Administration
                    </p>
                    <p className="text-muted text-xs">
                        Regional Welfare Office XI - Davao City
                    </p>
                    <h2 className="text-primary font-semibold mt-3">
                        Inventory Management System
                    </h2>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-2">
                            <AlertIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="admin@owwa.gov.ph"
                            required
                            autoComplete="email"
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 bg-background cursor-pointer"
                        />
                        <label htmlFor="remember-me" className="ml-2 text-sm text-muted cursor-pointer select-none">
                            Remember me
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Log In'
                        )}
                    </button>

                    {/* Home Button */}
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-surface-hover transition-all"
                    >
                        Home
                    </Link>
                </form>
            </div>

            {/* Footer */}

        </div>
    );
}

function LoginFormFallback() {
    return (
        <div className="w-full max-w-md">
            <div className="bg-surface rounded-2xl shadow-xl border border-border p-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-[70px] h-[70px] bg-surface-hover rounded-full animate-pulse" />
                    <div className="w-[70px] h-[70px] bg-surface-hover rounded-full animate-pulse" />
                </div>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-surface-hover rounded w-1/2 mx-auto" />
                    <div className="h-4 bg-surface-hover rounded w-3/4 mx-auto" />
                    <div className="h-12 bg-surface-hover rounded-lg" />
                    <div className="h-12 bg-surface-hover rounded-lg" />
                    <div className="h-12 bg-primary/30 rounded-lg" />
                    <div className="h-12 bg-surface-hover rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 pb-8">
                <Suspense fallback={<LoginFormFallback />}>
                    <LoginForm />
                </Suspense>
            </main>
        </div>
    );
}

function MoonIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    );
}

function AlertIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function EyeOffIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    );
}

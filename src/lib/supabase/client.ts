import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Provide fallback for build time when env vars might not be available
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a dummy client that will fail gracefully at runtime
        return createBrowserClient(
            'https://placeholder.supabase.co',
            'placeholder-key'
        );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

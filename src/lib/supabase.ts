import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SECURITY: Fail hard if Supabase is not configured - no mock mode in production
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Configuration Supabase manquante. ' +
        'Veuillez definir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d\'environnement.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});

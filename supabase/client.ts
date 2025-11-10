import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase not configured. Database features disabled. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.");
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
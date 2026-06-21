/* ════════════════════════════════════
   SUPABASE INITIALIZATION
════════════════════════════════════ */
const SUPABASE_URL = "https://mlvvtdqxucqqolcngkrg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fjGcSPF1IQlqY06J3DcKMA_kPp-ATFB";

// This makes supabaseClient available globally to any page that imports this file
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
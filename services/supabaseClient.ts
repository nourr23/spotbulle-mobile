import { createClient } from '@supabase/supabase-js';

// ⚠️ TEMP CONFIG FOR TESTING ONLY
// Replace these with your real Supabase project credentials.
// You can copy them from your existing web app env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
const SUPABASE_URL = 'https://nyxtckjfaajhacboxojd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHRja2pmYWFqaGFjYm94b2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY5OTIsImV4cCI6MjA2MTYxMjk5Mn0.9zpLjXat7L6TvfKQB93ef66bnQZgueAreyGZ8fjlPLA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});



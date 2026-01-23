/* =====================================================
   SUPABASE CLIENT – GLOBAL (NON MODULE)
   ===================================================== */

const SUPABASE_URL = 'https://hvynnsabvhyxmzkslylh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eW5uc2Fidmh5eG16a3NseWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5OTMsImV4cCI6MjA4NDMwNDk5M30.cs9I6rxW3WXkXZU-UfR4kozq3BXPRq1h-LqtDw0lpxM';

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/* Konfigurasi dan koneksi Supabase (client/browser). */
(function () {
  'use strict';

  // Isi URL project dan anon/publishable key dari Supabase Dashboard → Project Settings → API.
  // Anon key boleh digunakan di browser hanya jika Row Level Security (RLS) diaktifkan dengan benar.
  // JANGAN pernah menaruh SERVICE_ROLE_KEY di frontend.
  const SUPABASE_URL = 'https://epatedecqyfbalyydxqd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OOH8rGAtLmj2yJKCdNH2TQ_9QgKmhEE';

  const looksLikePlaceholder = (value) => !value || value.includes('YOUR_');
  const hasLibrary = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const isConfigured = hasLibrary && !looksLikePlaceholder(SUPABASE_URL) && !looksLikePlaceholder(SUPABASE_ANON_KEY);

  window.joyinSupabase = isConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  window.JOYIN_SUPABASE_CONFIGURED = isConfigured;
  if (!hasLibrary) {
    console.error('[Joyin] Supabase JS CDN gagal dimuat. Periksa koneksi internet atau CDN.');
  } else if (!isConfigured) {
    console.info('[Joyin] Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di js/supabase.js.');
  }
})();

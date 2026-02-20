const SUPABASE_URL =
  window.APP_CONFIG?.supabaseUrl || "https://edgyrjwwqidvsktapvbz.supabase.co";
const SUPABASE_ANON_KEY =
  window.APP_CONFIG?.supabaseAnonKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ3lyand3cWlkdnNrdGFwdmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTQ1NjQsImV4cCI6MjA4NzE5MDU2NH0.KKWOHAPuZ3hAbfT2Mjlu3lSn5RCyCd8HFZTWKrE2GNs";

window.APP_SUPABASE_URL = SUPABASE_URL;
window.APP_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

if (!window.supabase) {
  throw new Error("Supabase SDK nao foi carregado.");
}

import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseSchema = process.env.EXPO_PUBLIC_SUPABASE_SCHEMA || "public";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein (siehe .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: supabaseSchema,
  },
});

/**
 * Stellt sicher, dass eine (anonyme) Auth-Session existiert, bevor Daten
 * geladen werden — RLS-Policies ordnen den Zugriff über auth.uid() einem
 * Stammtisch zu (siehe stammtisch_access-Tabelle). Die Session wird über
 * AsyncStorage persistiert, läuft also nur beim allerersten App-Start.
 */
export async function ensureAuthSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

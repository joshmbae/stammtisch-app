import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

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
    persistSession: false,
  },
  db: {
    schema: supabaseSchema,
  },
});

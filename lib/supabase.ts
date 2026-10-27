import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;
export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
export function getSupabase() {
  if (!authConfigured) return null;
  if (!client)
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );
  return client;
}

export type AuthAvailability = {
  google: boolean;
  kakao: boolean;
  apple: boolean;
  email: boolean;
  signup: boolean;
};
export async function authAvailability(): Promise<AuthAvailability> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw Error("not-configured");
  const response = await fetch(url + "/auth/v1/settings", {
    headers: { apikey: key },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw Error("settings-unavailable");
  const value = await response.json();
  return {
    google: value.external?.google === true,
    kakao: value.external?.kakao === true,
    apple: value.external?.apple === true,
    email: value.external?.email === true,
    signup: value.disable_signup === false,
  };
}

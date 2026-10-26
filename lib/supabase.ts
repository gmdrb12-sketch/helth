import {createClient, type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export const authConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
export function getSupabase(){
 if(!authConfigured)return null;
 if(!client)client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return client;
}

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

const supabaseURL = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;
const supabaseServiceKey = ENV.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseURL || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration in ENV");
}

export const supabase = createClient(supabaseURL, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseURL, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;

export async function testDatabaseConnection(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('Supabase connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}
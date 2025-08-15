import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('categories').select('count', { count: 'exact' });
      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default SupabaseService;
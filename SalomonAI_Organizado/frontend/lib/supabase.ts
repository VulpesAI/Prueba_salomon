import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ENV } from '@/config/env';

const isValidUrl = (value: string | undefined): value is string => {
  if (!value) {
    return false;
  }

  try {
    void new URL(value);
    return true;
  } catch {
    return false;
  }
};

const createMissingEnvClient = (): SupabaseClient => {
  const error = new Error(
    'Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.'
  );

  return new Proxy(
    {},
    {
      get() {
        throw error;
      },
    }
  ) as SupabaseClient;
};

const supabaseUrl = ENV.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasValidConfig =
  isValidUrl(supabaseUrl) && typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient = hasValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createMissingEnvClient();

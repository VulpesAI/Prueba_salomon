import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

interface SupabaseAuthResponse {
  user: User | null;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!url || !serviceRoleKey) {
      this.logger.warn('Supabase credentials are not fully configured.');
      this.client = null;
      return;
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async getUser(accessToken: string): Promise<User | null> {
    if (!this.client) {
      this.logger.warn('Supabase client is not configured.');
      return null;
    }

    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error) {
      this.logger.warn(`Failed to fetch Supabase user: ${error.message}`);
      return null;
    }

    return (data as SupabaseAuthResponse | null)?.user ?? null;
  }
}

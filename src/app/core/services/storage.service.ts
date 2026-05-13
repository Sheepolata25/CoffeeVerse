import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private supabase = inject(SupabaseService);

  async upload(bucket: string, path: string, file: File): Promise<{ url: string | null; error: any }> {
    const { error } = await this.supabase.client.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { url: null, error };

    const { data } = this.supabase.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return { url: data.publicUrl, error: null };
  }
}

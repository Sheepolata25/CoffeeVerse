import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private supabase = inject(SupabaseService);

  async upload(bucket: string, path: string, file: File): Promise<{ url: string | null; error: any }> {
    const { error } = await this.supabase.client.storage
      .from(bucket)
      // upsert: true remplace le fichier si le chemin existe déjà (mise à jour de photo de profil ou de couverture)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { url: null, error };

    // Le bucket doit être configuré "public" dans Supabase pour que cette URL soit accessible sans token
    const { data } = this.supabase.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return { url: data.publicUrl, error: null };
  }
}

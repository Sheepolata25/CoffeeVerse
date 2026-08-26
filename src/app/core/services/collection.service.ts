import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Collection } from '../models/collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  collections = signal<Collection[]>([]);

  async loadCollections() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { data } = await this.supabase.client
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    this.collections.set((data as Collection[]) ?? []);
  }

  async createCollection(name: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase.client
      .from('collections')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (!error && data) {
      this.collections.update(c => [...c, data as Collection]);
    }

    return { data, error };
  }

  async deleteCollection(id: string) {
    const { error } = await this.supabase.client
      .from('collections')
      .delete()
      .eq('id', id);

    if (!error) {
      this.collections.update(c => c.filter(col => col.id !== id));
    }

    return { error };
  }

  // Les collections sont un champ de post_favorites.collection_id, pas une table de jonction séparée.
  // collectionId = null retire le favori de toute collection sans le supprimer des favoris.
  async assignToCollection(postId: string, collectionId: string | null) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { error: new Error('Not authenticated') };

    const { error } = await this.supabase.client
      .from('post_favorites')
      .update({ collection_id: collectionId })
      .eq('post_id', postId)
      .eq('user_id', userId);

    return { error };
  }
}

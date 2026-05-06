import { Injectable, inject, signal } from '@angular/core';
import { Post } from '../models/post.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

type PostFields = Pick<Post, 'title' | 'description' | 'image_url' | 'machine_brand' | 'grinder_brand' | 'coffee_brand' | 'bean_type' | 'water_temp' | 'tags'>;

@Injectable({ providedIn: 'root' })
export class PostService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  posts = signal<Post[]>([]);

  async loadPosts() {
    const { data } = await this.supabase.client
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    this.posts.set((data as Post[]) ?? []);
  }

  async createPost(post: PostFields, status: 'draft' | 'published' = 'published') {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase.client
      .from('posts')
      .insert({ ...post, user_id: userId, status })
      .select('*, profiles(username, avatar_url)')
      .single();

    if (!error && data && status === 'published') {
      this.posts.update(posts => [data as Post, ...posts]);
    }

    return { data, error };
  }

  async updatePost(id: string, updates: PostFields) {
    const { data, error } = await this.supabase.client
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('*, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      this.posts.update(posts => posts.map(p => p.id === id ? data as Post : p));
    }

    return { error };
  }

  async publishDraft(id: string) {
    const { data, error } = await this.supabase.client
      .from('posts')
      .update({ status: 'published' })
      .eq('id', id)
      .select('*, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      this.posts.update(posts => [data as Post, ...posts]);
    }

    return { error };
  }

  async loadUserPosts(userId: string): Promise<Post[]> {
    const { data } = await this.supabase.client
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    return (data as Post[]) ?? [];
  }

  async loadUserDrafts(userId: string): Promise<Post[]> {
    const { data } = await this.supabase.client
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .eq('user_id', userId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    return (data as Post[]) ?? [];
  }

  async loadAllTags(): Promise<string[]> {
    const { data } = await this.supabase.client
      .from('posts')
      .select('tags')
      .eq('status', 'published');
    if (!data) return [];
    const all = (data as { tags: string[] }[]).flatMap(p => p.tags ?? []);
    return [...new Set(all)].sort();
  }

  async deletePost(id: string) {
    const { error } = await this.supabase.client
      .from('posts')
      .delete()
      .eq('id', id);

    if (!error) {
      this.posts.update(posts => posts.filter(p => p.id !== id));
    }

    return { error };
  }
}

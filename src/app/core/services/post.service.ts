import { Injectable, inject, signal } from '@angular/core';
import { Post } from '../models/post.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PostService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  posts = signal<Post[]>([]);

  async loadPosts() {
    const { data } = await this.supabase.client
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false });

    this.posts.set((data as Post[]) ?? []);
  }

  async createPost(post: Pick<Post, 'title' | 'description' | 'machine_brand' | 'grinder_brand' | 'coffee_brand' | 'bean_type' | 'water_temp'>) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase.client
      .from('posts')
      .insert({ ...post, user_id: userId })
      .select('*, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      this.posts.update(posts => [data as Post, ...posts]);
    }

    return { data, error };
  }
}

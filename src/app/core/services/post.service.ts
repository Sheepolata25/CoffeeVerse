import { Injectable, inject, signal } from '@angular/core';
import { Post } from '../models/post.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

type PostFields = Pick<Post, 'title' | 'description' | 'image_url' | 'machine_brand' | 'grinder_brand' | 'coffee_brand' | 'bean_type' | 'water_temp' | 'tags'>;

const FULL_SELECT = '*, profiles(username, avatar_url), post_likes(user_id), post_favorites(user_id, collection_id), post_comments(id)';

@Injectable({ providedIn: 'root' })
export class PostService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  posts = signal<Post[]>([]);
  favoritedPosts = signal<Post[]>([]);

  async loadPosts() {
    const { data } = await this.supabase.client
      .from('posts')
      .select(FULL_SELECT)
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
      .select(FULL_SELECT)
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
      .select(FULL_SELECT)
      .single();

    if (!error && data) {
      this.posts.update(posts => posts.map(p =>
        p.id === id ? { ...(data as Post), post_likes: p.post_likes, post_favorites: p.post_favorites, post_comments: p.post_comments } : p
      ));
    }

    return { error };
  }

  async publishDraft(id: string) {
    const { data, error } = await this.supabase.client
      .from('posts')
      .update({ status: 'published' })
      .eq('id', id)
      .select(FULL_SELECT)
      .single();

    if (!error && data) {
      this.posts.update(posts => [data as Post, ...posts]);
    }

    return { data, error };
  }

  async loadFavoritedPosts(userId: string) {
    const { data } = await this.supabase.client
      .from('post_favorites')
      .select(`posts(${FULL_SELECT})`)
      .eq('user_id', userId);

    const posts = ((data ?? []) as any[]).map(d => d.posts).filter(Boolean) as Post[];
    this.favoritedPosts.set(posts);
  }

  async likePost(postId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (!error) {
      const updater = (posts: Post[]) => posts.map(p =>
        p.id === postId ? { ...p, post_likes: [...(p.post_likes ?? []), { user_id: userId }] } : p
      );
      this.posts.update(updater);
      this.favoritedPosts.update(updater);
    }
  }

  async unlikePost(postId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (!error) {
      const updater = (posts: Post[]) => posts.map(p =>
        p.id === postId ? { ...p, post_likes: (p.post_likes ?? []).filter(l => l.user_id !== userId) } : p
      );
      this.posts.update(updater);
      this.favoritedPosts.update(updater);
    }
  }

  async favoritePost(postId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('post_favorites')
      .insert({ post_id: postId, user_id: userId });

    if (!error) {
      this.posts.update(posts => posts.map(p =>
        p.id === postId ? { ...p, post_favorites: [...(p.post_favorites ?? []), { user_id: userId, collection_id: null }] } : p
      ));
      const post = this.posts().find(p => p.id === postId);
      if (post && !this.favoritedPosts().some(p => p.id === postId)) {
        this.favoritedPosts.update(posts => [post, ...posts]);
      }
    }
  }

  updatePostCollectionLocally(postId: string, collectionId: string | null) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const updater = (posts: Post[]) => posts.map(p =>
      p.id === postId
        ? { ...p, post_favorites: (p.post_favorites ?? []).map(f =>
            f.user_id === userId ? { ...f, collection_id: collectionId } : f
          )}
        : p
    );
    this.posts.update(updater);
    this.favoritedPosts.update(updater);
  }

  async unfavoritePost(postId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('post_favorites')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (!error) {
      this.posts.update(posts => posts.map(p =>
        p.id === postId ? { ...p, post_favorites: (p.post_favorites ?? []).filter(f => f.user_id !== userId) } : p
      ));
      this.favoritedPosts.update(posts => posts.filter(p => p.id !== postId));
    }
  }

  incrementCommentCount(postId: string) {
    this.posts.update(posts => posts.map(p =>
      p.id === postId ? { ...p, post_comments: [...(p.post_comments ?? []), { id: 'tmp' }] } : p
    ));
  }

  decrementCommentCount(postId: string) {
    this.posts.update(posts => posts.map(p =>
      p.id === postId ? { ...p, post_comments: (p.post_comments ?? []).slice(0, -1) } : p
    ));
  }

  async loadUserPosts(userId: string): Promise<Post[]> {
    const { data } = await this.supabase.client
      .from('posts')
      .select(FULL_SELECT)
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

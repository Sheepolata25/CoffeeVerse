import { Injectable, inject } from '@angular/core';
import { PostComment } from '../models/comment.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  async loadComments(postId: string): Promise<PostComment[]> {
    const { data } = await this.supabase.client
      .from('post_comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return (data as PostComment[]) ?? [];
  }

  async addComment(postId: string, content: string): Promise<{ data: PostComment | null; error: any }> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase.client
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim() })
      .select('*, profiles(username, avatar_url)')
      .single();

    return { data: data as PostComment, error };
  }

  async deleteComment(commentId: string): Promise<{ error: any }> {
    const { error } = await this.supabase.client
      .from('post_comments')
      .delete()
      .eq('id', commentId);
    return { error };
  }
}

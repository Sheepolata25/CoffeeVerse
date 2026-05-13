import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  async getRelationship(targetUserId: string): Promise<{ isFollowing: boolean; isBlocked: boolean }> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { isFollowing: false, isBlocked: false };

    const [{ data: followData }, { data: blockData }] = await Promise.all([
      this.supabase.client.from('follows').select('id').eq('follower_id', userId).eq('following_id', targetUserId).maybeSingle(),
      this.supabase.client.from('blocks').select('id').eq('blocker_id', userId).eq('blocked_id', targetUserId).maybeSingle(),
    ]);

    return { isFollowing: !!followData, isBlocked: !!blockData };
  }

  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [{ count: followers }, { count: following }] = await Promise.all([
      this.supabase.client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      this.supabase.client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return { followers: followers ?? 0, following: following ?? 0 };
  }

  async follow(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await this.supabase.client.from('follows').insert({ follower_id: userId, following_id: targetUserId });
  }

  async unfollow(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await this.supabase.client.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
  }

  async block(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await Promise.all([
      this.supabase.client.from('blocks').insert({ blocker_id: userId, blocked_id: targetUserId }),
      this.supabase.client.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId),
    ]);
  }

  async unblock(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await this.supabase.client.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetUserId);
  }
}

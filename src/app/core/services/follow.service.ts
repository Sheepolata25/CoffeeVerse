import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  myFollowersCount = signal(0);
  myFollowingCount = signal(0);
  followingList = signal<{ id: string; username: string; avatar_url: string | null }[]>([]);
  blockedUserIds = signal<string[]>([]);
  blockedUsers = signal<{ id: string; username: string; avatar_url: string | null }[]>([]);

  async loadBlockedUsers() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.blockedUserIds.set([]); this.blockedUsers.set([]); return; }

    const { data } = await this.supabase.client
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    const ids = (data ?? []).map((r: any) => r.blocked_id);
    this.blockedUserIds.set(ids);

    if (!ids.length) { this.blockedUsers.set([]); return; }

    const { data: profiles } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    this.blockedUsers.set((profiles ?? []) as { id: string; username: string; avatar_url: string | null }[]);
  }

  async loadFollowingList() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.followingList.set([]); return; }

    const { data: follows } = await this.supabase.client
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const ids = (follows ?? []).map((r: any) => r.following_id);
    if (!ids.length) { this.followingList.set([]); return; }

    const { data: profiles } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    this.followingList.set((profiles ?? []) as { id: string; username: string; avatar_url: string | null }[]);
  }

  async loadMyFollowCounts() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const counts = await this.getFollowCounts(userId);
    this.myFollowersCount.set(counts.followers);
    this.myFollowingCount.set(counts.following);
  }

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
    const { error } = await this.supabase.client.from('follows').insert({ follower_id: userId, following_id: targetUserId });
    if (!error) this.myFollowingCount.update(c => c + 1);
  }

  async unfollow(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const { error } = await this.supabase.client.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
    if (!error) this.myFollowingCount.update(c => Math.max(0, c - 1));
  }

  async block(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await Promise.all([
      this.supabase.client.from('blocks').insert({ blocker_id: userId, blocked_id: targetUserId }),
      this.supabase.client.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId),
    ]);
    await this.loadBlockedUsers();
  }

  async unblock(targetUserId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    await this.supabase.client.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetUserId);
    this.blockedUserIds.update(ids => ids.filter(id => id !== targetUserId));
    this.blockedUsers.update(users => users.filter(u => u.id !== targetUserId));
  }
}

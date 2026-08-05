import { Injectable, inject, signal } from '@angular/core';
import { Activity } from '../models/activity.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  activities = signal<Activity[]>([]);

  async loadActivities() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { data } = await this.supabase.client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    this.activities.set((data as Activity[]) ?? []);
  }

  async remove(type: Activity['type'], postId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    await this.supabase.client
      .from('activities')
      .delete()
      .eq('user_id', userId)
      .eq('type', type)
      .eq('post_id', postId);

    this.activities.update(acts => acts.filter(a => !(a.type === type && a.post_id === postId)));
  }

  async track(type: Activity['type'], postId: string, postTitle: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    await this.supabase.client
      .from('activities')
      .delete()
      .eq('user_id', userId)
      .eq('type', type)
      .eq('post_id', postId);

    const { data } = await this.supabase.client
      .from('activities')
      .insert({ user_id: userId, type, post_id: postId, post_title: postTitle })
      .select('*')
      .single();

    if (data) {
      this.activities.update(acts => [
        data as Activity,
        ...acts.filter(a => !(a.type === type && a.post_id === postId)),
      ].slice(0, 20));
    }
  }
}

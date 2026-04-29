import { Injectable, inject, signal, effect } from '@angular/core';
import { Profile } from '../models/profile.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  profile = signal<Profile | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadProfile();
      } else {
        this.profile.set(null);
      }
    });
  }

  async loadProfile() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    this.profile.set(data);
  }

  async updateProfile(updates: Partial<Pick<Profile, 'username' | 'bio' | 'avatar_url'>>) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { error: new Error('Non authentifié') };

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (!error) this.profile.set(data);
    return { data, error };
  }
}

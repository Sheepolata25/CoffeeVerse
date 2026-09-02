import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    // Hydrate la session depuis le localStorage au démarrage (Supabase persiste la session automatiquement)
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user ?? null);
    });

    // Écoute les changements de session en temps réel (login, logout, expiration et refresh du token)
    this.supabase.client.auth.onAuthStateChange((_, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  async signUp(email: string, password: string, username: string) {
    return this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
  }

  async signIn(email: string, password: string) {
    return this.supabase.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}

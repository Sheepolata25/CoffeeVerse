import { Injectable, inject, signal } from '@angular/core';
import { Roaster } from '../models/roaster.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class RoasterService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  approved = signal<Roaster[]>([]);
  pending = signal<Roaster[]>([]);
  dailyRoaster = signal<Roaster | null>(null);

  async loadDailyRoaster(): Promise<void> {
    const { count } = await this.supabase.client
      .from('roasters')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    if (!count) return;
    // Timestamp converti en jours entiers, modulo le total → même torréfacteur pour tout le monde chaque jour
    const offset = Math.floor(Date.now() / 86400000) % count;
    const { data } = await this.supabase.client
      .from('roasters')
      .select('*')
      .eq('status', 'approved')
      .range(offset, offset);
    this.dailyRoaster.set((data?.[0] as Roaster) ?? null);
  }

  async loadApproved() {
    const { data } = await this.supabase.client
      .from('roasters')
      .select('*')
      .eq('status', 'approved')
      .order('name');
    this.approved.set((data as Roaster[]) ?? []);
  }

  async loadPending() {
    const { data } = await this.supabase.client
      .from('roasters')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    this.pending.set((data as Roaster[]) ?? []);
  }

  async submitRoaster(roaster: {
    name: string;
    lat: number;
    lng: number;
    country: string | null;
    city: string | null;
    website: string | null;
    description: string | null;
  }): Promise<{ error: any }> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return { error: new Error('Not authenticated') };

    const { error } = await this.supabase.client
      .from('roasters')
      .insert({ ...roaster, submitted_by: userId, status: 'pending', source: 'user' });
    return { error };
  }

  async approve(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase.client
      .from('roasters')
      .update({ status: 'approved' })
      .eq('id', id);
    if (!error) {
      const item = this.pending().find(r => r.id === id);
      if (item) {
        const approvedItem: Roaster = { ...item, status: 'approved' };
        this.approved.update(list => [...list, approvedItem].sort((a, b) => a.name.localeCompare(b.name)));
        this.pending.update(list => list.filter(r => r.id !== id));
      }
    }
    return { error };
  }

  async reject(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase.client
      .from('roasters')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (!error) {
      this.pending.update(list => list.filter(r => r.id !== id));
    }
    return { error };
  }

  async importFromOSM(): Promise<{ imported: number; found: number; detail?: string; error?: any }> {
    try {
      const query = `
        [out:json][timeout:90];
        (
          node["craft"="roaster"];
          node["craft"="coffee_roaster"];
          node["shop"="coffee_roaster"];
          node["craft"="coffee"]["roasting"="yes"];
          node["shop"="coffee"]["roasting"="yes"];
        );
        out body;
      `;

      const tryFetch = async (url: string) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      // openstreetmap.fr plus fiable pour les requêtes globales, overpass-api.de en fallback
      let res = await tryFetch('https://overpass.openstreetmap.fr/api/interpreter');
      if (!res.ok) res = await tryFetch('https://overpass-api.de/api/interpreter');
      if (!res.ok) {
        return { imported: 0, found: 0, detail: `Overpass HTTP ${res.status}`, error: res.statusText };
      }

      const data = await res.json();
      const elements: any[] = data.elements ?? [];

      const rows = elements
        .filter(el => el.tags?.name && el.lat != null && el.lon != null)
        .map(el => ({
          name: el.tags.name as string,
          lat: el.lat as number,
          lng: el.lon as number,
          osm_id: `osm_node_${el.id}`,
          country: (el.tags['addr:country'] ?? null) as string | null,
          city: (el.tags['addr:city'] ?? el.tags['addr:town'] ?? null) as string | null,
          website: (el.tags.website ?? el.tags.url ?? null) as string | null,
          description: null,
          source: 'osm',
          submitted_by: null,
          status: 'approved',
        }));

      let imported = 0;
      let firstSupabaseError: any = null;
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        // onConflict: 'osm_id' → mise à jour si le torréfacteur existe déjà (import idempotent)
        const { error } = await this.supabase.client
          .from('roasters')
          .upsert(rows.slice(i, i + chunkSize), { onConflict: 'osm_id' });
        if (error) {
          console.error('[OSM import] Supabase upsert error:', error);
          if (!firstSupabaseError) firstSupabaseError = error;
        } else {
          imported += Math.min(chunkSize, rows.length - i);
        }
      }

      if (firstSupabaseError) {
        return {
          imported,
          found: elements.length,
          detail: firstSupabaseError.message ?? JSON.stringify(firstSupabaseError),
          error: firstSupabaseError,
        };
      }

      await this.loadApproved();
      return { imported, found: elements.length };
    } catch (error: any) {
      console.error('[OSM import] caught error:', error);
      return { imported: 0, found: 0, detail: error?.message ?? String(error), error };
    }
  }
}

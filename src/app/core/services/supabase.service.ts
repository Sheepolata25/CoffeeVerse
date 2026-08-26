import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Point d'entrée unique vers Supabase, injecté dans tous les services via inject().
// Les credentials (url, key) viennent de environments/environment.ts
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabase.url,
    environment.supabase.key
  );
}

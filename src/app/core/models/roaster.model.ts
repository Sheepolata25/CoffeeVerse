export interface Roaster {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  osm_id: string | null;
  source: string;
  submitted_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

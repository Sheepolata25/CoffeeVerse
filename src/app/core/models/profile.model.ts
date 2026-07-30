export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  badge: string;
  cover_url: string | null;
  location: string | null;
  favorite_brew: string | null;
  goto_bean: string | null;
  preferred_roast: string | null;
  favorite_gear: string | null;
  preferred_water_temp: number | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

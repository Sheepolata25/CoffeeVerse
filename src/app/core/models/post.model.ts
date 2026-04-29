export interface Post {
  id: string;
  user_id: string;
  title: string;
  description: string;
  machine_brand: string | null;
  grinder_brand: string | null;
  coffee_brand: string | null;
  bean_type: string | null;
  water_temp: number | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

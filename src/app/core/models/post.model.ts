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
  image_url: string | null;
  tags: string[];
  status: 'draft' | 'published';
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  post_likes?: { user_id: string }[];
  post_favorites?: { user_id: string; collection_id: string | null }[];
  post_comments?: { id: string }[];
}

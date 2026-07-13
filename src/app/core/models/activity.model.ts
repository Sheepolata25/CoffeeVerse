export interface Activity {
  id: string;
  user_id: string;
  type: 'like' | 'favorite' | 'comment' | 'post';
  post_id: string;
  post_title: string;
  created_at: string;
}

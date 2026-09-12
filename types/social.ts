export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type PostType =
  "IMAGE" | "VIDEO" | "TEXT" | "TIP" | "PLACE_REVIEW" | "TRIP_UPDATE" | "ROUTE";
export interface Profile {
  id: string;
  username: string;
  name: string;
  bio: string;
  city: string;
  country: string;
  avatar_url: string | null;
  cover_url?: string | null;
  countries: number;
  cities: number;
  routes: number;
  creator: boolean;
  traveling: string | null;
  followers?: number;
  following?: number;
}
export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  image_url: string;
  category: string;
  description: string;
  season: string;
}
export interface Place {
  id: string;
  name: string;
  destination_id: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
}
export interface PostMedia {
  id: string;
  post_id: string;
  type: "IMAGE" | "VIDEO";
  storage_path: string;
  position: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  alt: string;
  url?: string;
}
export interface SocialPost {
  id: string;
  author_id: string;
  type: PostType;
  caption: string;
  destination_id: string | null;
  place_id: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  trip_id: string | null;
  visibility: Visibility;
  category: string;
  rating: number | null;
  visited_at: string | null;
  created_at: string;
  updated_at: string;
  author: Profile;
  destination: Destination | null;
  media: PostMedia[];
  likes: number;
  comment_count: number;
  saves: number;
  liked: boolean;
  saved: boolean;
  demo?: boolean;
}
export interface Passport {
  id: string;
  user_id: string;
  trip_id: string;
  name: string;
  destination: string;
  country: string;
  start_date: string;
  end_date: string;
  days: number;
  place_count: number;
  public_route_id: string | null;
  visible: boolean;
  awarded_at: string;
}
export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author: Profile;
}
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
}
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "FOLLOW"
    | "LIKE"
    | "COMMENT"
    | "REPLY"
    | "SAVE_MILESTONE"
    | "ROUTE_SHARED"
    | "MENTION";
  body: string;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
}
export interface Report {
  id: string;
  reporter_id: string;
  target_type: "POST" | "COMMENT" | "PROFILE";
  target_id: string;
  reason: string;
  description: string;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  created_at: string;
}
export interface FeedPage {
  posts: SocialPost[];
  nextCursor: string | null;
  demo: boolean;
}

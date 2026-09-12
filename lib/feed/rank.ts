import type { SocialPost } from "@/types/social";
export interface FeedPreferences {
  destinations: string[];
  categories: string[];
  creators: string[];
}
export function trendingScore(
  post: Pick<SocialPost, "likes" | "comment_count" | "saves" | "created_at">,
  now = Date.now(),
) {
  const age = Math.max(0, (now - Date.parse(post.created_at)) / 3600000);
  return (
    (Math.log1p(post.likes + post.comment_count * 3 + post.saves * 5) + 1) /
    Math.pow(age + 2, 0.8)
  );
}
export function rankFeed(
  posts: SocialPost[],
  prefs: FeedPreferences,
  now = Date.now(),
) {
  const score = (p: SocialPost) =>
    trendingScore(p, now) +
    (prefs.destinations.includes(p.destination_id ?? "") ? 2 : 0) +
    (prefs.categories.includes(p.category) ? 1 : 0) +
    (prefs.creators.includes(p.author_id) ? 1.5 : 0);
  return [...posts].sort(
    (a, b) => score(b) - score(a) || b.id.localeCompare(a.id),
  );
}

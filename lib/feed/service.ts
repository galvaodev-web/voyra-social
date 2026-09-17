import "server-only";
import { createClient } from "@/lib/supabase/server";
import { demoPosts, destinations } from "@/lib/demo";
import type {
  FeedPage,
  SocialPost,
  Destination,
  Profile,
} from "@/types/social";
import { rankFeed } from "./rank";
export interface FeedQuery {
  cursor?: string | null;
  mode?: string;
  category?: string;
  destination?: string;
  author?: string;
  search?: string;
}
export async function getFeed(options: FeedQuery = {}): Promise<FeedPage> {
  const client = await createClient();
  if (!client) {
    let posts =
      options.mode === "following" || options.mode === "saved" ? [] : demoPosts;
    if (options.destination)
      posts = posts.filter((p) => p.destination_id === options.destination);
    if (options.author)
      posts = posts.filter((p) => p.author_id === options.author);
    if (
      options.category &&
      !["Para você", "Em alta"].includes(options.category)
    )
      posts = posts.filter((p) => p.category === options.category);
    if (options.search)
      posts = posts.filter((p) =>
        `${p.caption} ${p.place_name} ${p.author.name} ${p.destination?.name}`
          .toLowerCase()
          .includes(options.search!.toLowerCase()),
      );
    return { posts: options.cursor ? [] : posts, nextCursor: null, demo: true };
  }
  const { data, error } = await client
    .schema("social")
    .rpc("feed_page", {
      page_cursor: options.cursor ?? null,
      feed_mode: options.mode ?? "for-you",
      category_filter: options.category ?? null,
      destination_filter: options.destination ?? null,
      author_filter: options.author ?? null,
      search_query: options.search ?? null,
    });
  if (error) throw new Error("Não foi possível carregar o feed.");
  const rows = (data ?? []) as SocialPost[];
  const window = rows.slice(0, 12);
  const paths = window.flatMap((p) => p.media.map((m) => m.storage_path));
  const urls = new Map<string, string>();
  await Promise.all(
    ["social-images", "social-videos"].map(async (bucket) => {
      const bucketPaths = paths.filter((p) =>
        bucket === "social-images"
          ? !p.includes("/video-")
          : p.includes("/video-"),
      );
      if (!bucketPaths.length) return;
      const result = await client.storage
        .from(bucket)
        .createSignedUrls(bucketPaths, 300);
      result.data?.forEach((item) => {
        if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
      });
    }),
  );
  for (const post of window)
    for (const media of post.media) media.url = urls.get(media.storage_path);
  const last = window.at(-1);
  let ordered = window;
  if (options.mode !== "following") {
    const {
      data: { user },
    } = await client.auth.getUser();
    const prefs = {
      destinations: [] as string[],
      categories: [] as string[],
      creators: [] as string[],
    };
    if (user) {
      const [follows, dests, explicit] = await Promise.all([
        client
          .schema("social")
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id),
        client
          .schema("social")
          .from("destination_follows")
          .select("destination_id")
          .eq("user_id", user.id),
        client
          .schema("social")
          .from("user_preferences")
          .select("destination_ids,categories,creator_ids")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      prefs.creators = Array.from(
        new Set([
          ...(follows.data?.map((r) => r.following_id) ?? []),
          ...((explicit.data?.creator_ids as string[] | null) ?? []),
        ]),
      );
      prefs.destinations = Array.from(
        new Set([
          ...(dests.data?.map((r) => r.destination_id) ?? []),
          ...((explicit.data?.destination_ids as string[] | null) ?? []),
        ]),
      );
      prefs.categories = (explicit.data?.categories as string[] | null) ?? [];
    }
    ordered = rankFeed(window, prefs);
  }
  return {
    posts: ordered,
    nextCursor:
      rows.length > 12 && last ? `${last.created_at}|${last.id}` : null,
    demo: false,
  };
}
export async function getDestinations(): Promise<Destination[]> {
  const client = await createClient();
  if (!client) return destinations;
  const { data, error } = await client
    .schema("social")
    .from("destinations")
    .select("*")
    .order("name")
    .limit(100);
  if (error) throw new Error("Não foi possível carregar os destinos.");
  return data ?? [];
}
export async function getProfile(username: string): Promise<Profile | null> {
  const client = await createClient();
  if (!client) {
    const { travelers } = await import("@/lib/demo");
    return travelers.find((p) => p.username === username) ?? null;
  }
  const { data } = await client
    .schema("social")
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  return data;
}
export async function getPost(id: string): Promise<SocialPost | null> {
  const client = await createClient();
  if (!client) return demoPosts.find((p) => p.id === id) ?? null;
  const { data, error } = await client
    .schema("social")
    .rpc("post_detail", { target_id: id });
  if (error || !data) return null;
  const post = data as SocialPost;
  await Promise.all(
    post.media.map(async (m) => {
      const { data: signed } = await client.storage
        .from(m.type === "VIDEO" ? "social-videos" : "social-images")
        .createSignedUrl(m.storage_path, 300);
      m.url = signed?.signedUrl;
    }),
  );
  return post;
}

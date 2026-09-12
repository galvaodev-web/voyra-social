import { z } from "zod";
export const usernameSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,24}$/, "Use de 3 a 24 letras minúsculas, números ou _.");
export const postSchema = z.object({
  type: z.enum([
    "IMAGE",
    "VIDEO",
    "TEXT",
    "TIP",
    "PLACE_REVIEW",
    "TRIP_UPDATE",
    "ROUTE",
  ]),
  caption: z
    .string()
    .trim()
    .min(3, "Conte um pouco mais: pelo menos 3 caracteres.")
    .max(3000),
  destination_id: z.string().uuid().nullable(),
  place_name: z.string().trim().max(120).nullable(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]),
  category: z.string().max(40),
  rating: z.number().min(0.5).max(5).nullable(),
  visited_at: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable(),
  trip_id: z.string().uuid().nullable().default(null),
});
export const commentSchema = z.string().trim().min(1).max(1200);
export const collectionSchema = z.object({
  name: z.string().trim().min(2).max(70),
  description: z.string().max(300).default(""),
});
export const reportReasons = [
  "Spam",
  "Assédio",
  "Conteúdo impróprio",
  "Informação enganosa",
  "Golpe",
  "Outro",
] as const;
export function extractTags(text: string) {
  return [
    ...new Set(
      Array.from(text.matchAll(/#([\p{L}\p{N}_]{1,50})/gu), (m) =>
        m[1].toLowerCase(),
      ),
    ),
  ].slice(0, 20);
}
export function extractMentions(text: string) {
  return [
    ...new Set(Array.from(text.matchAll(/@([a-z0-9_]{3,24})\b/g), (m) => m[1])),
  ].slice(0, 10);
}

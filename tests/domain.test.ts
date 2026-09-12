import { describe, it, expect } from "vitest";
import {
  postSchema,
  usernameSchema,
  extractTags,
  extractMentions,
} from "../lib/validation";
import { sniffMime, validateFile, IMAGE_LIMIT } from "../lib/media";
import { rankFeed, trendingScore } from "../lib/feed/rank";
import { demoPosts } from "../lib/demo";
describe("publicação e identidade", () => {
  it("rejeita username duplicável por capitalização e espaços", () => {
    for (const name of ["Marina", "marina costa", "ab", "../../../"])
      expect(usernameSchema.safeParse(name).success).toBe(false);
    expect(usernameSchema.parse("marina_costa")).toBe("marina_costa");
  });
  it("valida visibilidade e avaliação", () => {
    const post = {
      type: "TIP",
      caption: "Chegue cedo.",
      destination_id: null,
      place_name: null,
      visibility: "PUBLIC",
      category: "História",
      rating: null,
      visited_at: null,
    };
    expect(postSchema.safeParse(post).success).toBe(true);
    expect(
      postSchema.safeParse({ ...post, visibility: "EVERYONE" }).success,
    ).toBe(false);
    expect(postSchema.safeParse({ ...post, rating: 6 }).success).toBe(false);
  });
  it("deduplica hashtags e menções sem perder acentos", () => {
    expect(extractTags("#Roma #roma #Japão")).toEqual(["roma", "japão"]);
    expect(extractMentions("@marina @marina")).toEqual(["marina"]);
  });
});
describe("upload", () => {
  it("rejeita arquivo disfarçado e excesso de tamanho", () => {
    expect(
      sniffMime(new Uint8Array([60, 115, 99, 114, 105, 112, 116])),
    ).toBeNull();
    expect(
      validateFile({ type: "image/jpeg", size: IMAGE_LIMIT + 1 }),
    ).toBeTruthy();
    expect(validateFile({ type: "image/svg+xml", size: 100 })).toBeTruthy();
  });
  it("reconhece assinatura JPG", () =>
    expect(sniffMime(new Uint8Array([255, 216, 255, 0]))).toBe("image/jpeg"));
});
describe("ranking", () => {
  it("valoriza recência e preferências sem alterar entrada", () => {
    const now = Date.parse("2026-09-11T12:00:00Z");
    const before = [...demoPosts];
    const ranked = rankFeed(
      demoPosts,
      {
        destinations: [demoPosts[2].destination_id!],
        creators: [demoPosts[2].author_id],
        categories: ["Baixo custo"],
      },
      now,
    );
    expect(ranked[0].id).toBe(demoPosts[2].id);
    expect(demoPosts).toEqual(before);
    expect(
      trendingScore({ ...demoPosts[0], created_at: "2020-01-01" }, now),
    ).toBeLessThan(trendingScore(demoPosts[0], now));
  });
});

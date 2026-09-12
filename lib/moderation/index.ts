export interface ModerationResult {
  status: "PENDING" | "REVIEW" | "APPROVED";
  reasons: string[];
}
export interface ModerationProvider {
  reviewText(text: string): Promise<ModerationResult>;
  reviewMedia(path: string): Promise<ModerationResult>;
}
export const moderation: ModerationProvider = {
  async reviewText() {
    return { status: "PENDING", reasons: [] };
  },
  async reviewMedia() {
    return { status: "PENDING", reasons: [] };
  },
};
export const communityAttribution = "Viajantes da comunidade têm recomendado";
export interface DeferredLocationPublication {
  postId: string;
  publishAfterDeparture: boolean;
  status: "AWAITING_USER_CONFIRMATION";
}

export type AnalyticsEvent =
  | "post_created"
  | "post_viewed"
  | "post_liked"
  | "post_saved"
  | "user_followed"
  | "destination_followed"
  | "place_added_to_trip"
  | "route_viewed";
export interface AnalyticsProvider {
  track(
    event: AnalyticsEvent,
    properties: Record<string, string | number>,
  ): Promise<void>;
}
// Disabled until consent and a provider are configured. Never include GPS or private trip data.
export const analytics: AnalyticsProvider = { async track() {} };

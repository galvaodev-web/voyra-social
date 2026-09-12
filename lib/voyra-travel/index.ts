import "server-only";
import { z } from "zod";
const tripSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  destination: z.string(),
  start_date: z.string(),
});
export type UserTrip = z.infer<typeof tripSchema>;
export class TravelUnavailable extends Error {
  constructor() {
    super(
      "A conexão com o planejamento Voyra Travel ainda não está disponível.",
    );
  }
}
async function travelRequest(path: string, token: string, body?: unknown) {
  const base = process.env.VOYRA_TRAVEL_API_URL;
  if (!base) throw new TravelUnavailable();
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      "Não foi possível acessar o planejamento. Tente novamente.",
    );
  return response.json() as Promise<unknown>;
}
export async function getUserTrips(token: string): Promise<UserTrip[]> {
  return z.array(tripSchema).parse(await travelRequest("/social/trips", token));
}
export async function addPlaceToTrip(
  token: string,
  tripId: string,
  postId: string,
) {
  return travelRequest(
    `/social/trips/${z.string().uuid().parse(tripId)}/places`,
    token,
    {
      postId: z.string().uuid().parse(postId),
      idempotencyKey: `${tripId}:${postId}`,
    },
  );
}
export function openTrip(id: string) {
  return `${process.env.NEXT_PUBLIC_TRAVEL_URL ?? "https://voyra.com"}/viagens/${encodeURIComponent(id)}`;
}
export async function publishTrip(token: string, tripId: string) {
  return travelRequest("/social/published-trips", token, {
    tripId,
    consent: true,
  });
}
export async function importRoute(token: string, routeId: string) {
  return travelRequest("/social/import-route", token, { routeId });
}

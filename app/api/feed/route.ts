import { getFeed } from "@/lib/feed/service";

export const dynamic = "force-static";

export async function GET(request: Request) {
  if (process.env.GITHUB_ACTIONS) return Response.json(await getFeed());

  const p = new URL(request.url).searchParams;
  try {
    return Response.json(
      await getFeed({
        cursor: p.get("cursor"),
        mode: p.get("mode") ?? undefined,
        search: p.get("search") ?? undefined,
      }),
    );
  } catch {
    return Response.json(
      { error: "Não foi possível carregar o feed." },
      { status: 500 },
    );
  }
}

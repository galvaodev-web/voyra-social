import { getFeed, getDestinations } from "@/lib/feed/service";
import { Feed } from "@/components/feed/Feed";
export default async function HomePage() {
  const [feed, destinations] = await Promise.all([
    getFeed(),
    getDestinations(),
  ]);
  return <Feed initial={feed} destinations={destinations} />;
}

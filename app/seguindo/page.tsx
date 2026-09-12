import { getFeed, getDestinations } from "@/lib/feed/service";
import { Feed } from "@/components/feed/Feed";
export const metadata = { title: "Seguindo", robots: { index: false } };
export default async function Page() {
  return (
    <Feed
      initial={await getFeed({ mode: "following" })}
      destinations={await getDestinations()}
      mode="following"
      title="As histórias de quem você acompanha."
    />
  );
}

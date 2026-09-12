import { getFeed, getDestinations } from "@/lib/feed/service";
import { Feed } from "@/components/feed/Feed";
import { Collections } from "@/components/posts/Collections";
export const metadata = { title: "Meus salvos", robots: { index: false } };
export default async function Page() {
  return (
    <>
      <Collections />
      <Feed
        initial={await getFeed({ mode: "saved" })}
        destinations={await getDestinations()}
        mode="saved"
        title="Guarde a inspiração. Prepare o próximo capítulo."
      />
    </>
  );
}

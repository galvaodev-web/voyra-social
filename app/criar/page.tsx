import { getDestinations } from "@/lib/feed/service";
import { CreatePost } from "@/components/posts/CreatePost";
export const metadata = {
  title: "Compartilhar experiência",
  robots: { index: false },
};
export default async function Page() {
  return <CreatePost destinations={await getDestinations()} />;
}

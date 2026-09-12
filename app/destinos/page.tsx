import { getDestinations } from "@/lib/feed/service";
import { DestinationCard } from "@/components/destinations/DestinationCard";
export const metadata = { title: "Descubra destinos" };
export default async function Page() {
  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">SEU PRÓXIMO CAPÍTULO</span>
          <h1>Um mundo inteiro de possibilidades.</h1>
          <p>Descubra lugares através das histórias de quem já esteve lá.</p>
        </div>
      </section>
      <div className="destinations-grid">
        {(await getDestinations()).map((d) => (
          <DestinationCard destination={d} key={d.id} />
        ))}
      </div>
    </>
  );
}

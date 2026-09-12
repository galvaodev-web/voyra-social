import Link from "next/link";
export const metadata = { title: "Roteiros da comunidade" };
export default function Page() {
  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">INSPIRAÇÃO QUE VIRA CAMINHO</span>
          <h1>Veja uma viagem. Vá também.</h1>
          <p>Roteiros públicos de quem conhece o caminho.</p>
        </div>
      </section>
      <section className="empty-state">
        <h2>Os próximos roteiros estão a caminho.</h2>
        <p>
          A publicação e importação de roteiros dependem da conexão com o Voyra
          Travel.
          <br />
          Enquanto isso, organize os lugares que inspiram você.
        </p>
        <Link href="/salvos" className="primary">
          Organizar minhas descobertas
        </Link>
      </section>
    </>
  );
}

"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h2>Houve um desvio no caminho.</h2>
      <p>
        Não foi possível carregar esta página. Tente novamente em alguns
        instantes.
      </p>
      <button className="primary" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}

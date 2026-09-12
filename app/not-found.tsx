import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-state">
      <h2>Este caminho ainda não está no mapa.</h2>
      <p>
        A publicação ou página não existe, ou não está disponível para sua
        conta.
      </p>
      <Link href="/" className="primary">
        Voltar às descobertas
      </Link>
    </section>
  );
}

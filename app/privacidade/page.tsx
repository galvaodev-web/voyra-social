import { AccountRequests } from "@/components/AccountRequests";
export const metadata = { title: "Privacidade" };

export default function Page() {
  const controller = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "Operador do Voyra";
  const contact = process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <article className="prose">
      <h1>Seu mundo. Sua privacidade.</h1>
      <p>
        {controller} controla os dados tratados no Voyra Travel e Voyra Social.
        {contact ? <> Solicitações de privacidade também podem ser enviadas para <a href={`mailto:${contact}`}>{contact}</a>.</> : null}
      </p>
      <h2>O que é compartilhado</h2>
      <p>
        Perfil, posts, roteiros, Passport, Recap e Travel Tokens aparecem publicamente somente conforme a visibilidade escolhida. Viagens privadas, documentos, reservas, participantes e despesas detalhadas não são publicados.
      </p>
      <h2>Localização e mídia</h2>
      <p>
        O produto não coleta GPS ao vivo. Fotos ficam em buckets privados e são entregues por links temporários de até cinco minutos. Conteúdo tornado público pode ser copiado por terceiros durante esse período.
      </p>
      <h2>Exportação</h2>
      <p>
        A exportação abaixo gera imediatamente um arquivo JSON com dados de conta, viagens, gastos, metadados de documentos e reservas, buscas, alertas, Tokens, interações sociais, preferências e eventos vinculados ao usuário. Arquivos binários não são incluídos no pacote.
      </p>
      <h2>Exclusão</h2>
      <p>
        A exclusão inicia imediatamente a remoção coordenada da identidade, dados Travel e Social, arquivos privados e cliente Stripe. Uma fila protegida repete limpezas que falharem temporariamente. Registros que precisem ser preservados por obrigação legal devem ser definidos pelo operador antes do lançamento público.
      </p>
      <AccountRequests />
    </article>
  );
}

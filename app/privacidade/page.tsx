import { AccountRequests } from "@/components/AccountRequests";
export const metadata = { title: "Privacidade" };
export default function Page() {
  return (
    <article className="prose">
      <h1>Seu mundo. Sua privacidade.</h1>
      <p>
        Esta página descreve os controles da versão inicial. A política
        definitiva, identidade do controlador, contato e prazos de atendimento
        devem ser publicados antes da abertura ao público.
      </p>
      <h2>O que é compartilhado</h2>
      <p>
        Seu perfil social inclui apenas as informações que você escolhe
        publicar. Posts podem ser públicos, visíveis a seguidores ou privados.
        Coleções e salvos pertencem à sua conta. O mesmo identificador de
        usuário conecta os produtos Voyra.
      </p>
      <h2>Localização e viagens</h2>
      <p>
        Não coletamos GPS ao vivo. Evite publicar endereço de hospedagem,
        documentos, localizadores ou informações financeiras. Viagens privadas
        não são exibidas no feed. Regiões e locais marcados são contexto
        escolhido pelo autor.
      </p>
      <h2>Mídia e acesso</h2>
      <p>
        Arquivos são armazenados no Supabase com regras de acesso e links
        temporários. Fotos públicas podem ser copiadas por terceiros. A
        revogação de um link temporário não é instantânea: o prazo atual é de
        até cinco minutos.
      </p>
      <h2>Seus controles</h2>
      <p>
        Você pode editar seu perfil, remover curtidas e salvos, bloquear
        usuários e denunciar conteúdo. Exportação e exclusão são solicitações
        pendentes de processamento, ainda sem automação.
      </p>
      <AccountRequests />
    </article>
  );
}

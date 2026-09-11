# Arquitetura — ecossistema Voyra

## Dois produtos, uma identidade

`voyra`/`voyra-web` continua responsável pelo planejamento e dados privados. `voyra-social` é um repositório Next.js separado responsável por descoberta e experiências públicas. Destinos, roteiros e viagens publicados deverão ser compartilhados por contratos explícitos, sem copiar agregados privados.

O schema local do Travel foi inspecionado em `../voyra/supabase/schema.sql` e `../voyra/supabase/migrations/20260911_launch.sql`. Ele usa `public.profiles(id,name,city,avatar_url,saved_routes,created_at,updated_at)`, `public.trips` com `owner_id` e agregado JSON `data`, além de `public.published_routes` com allowlist e RLS próprios. Nenhum arquivo do Travel foi alterado.

## Dados compartilhados

- `auth.users`: única identidade, senha e ID por pessoa.
- `public.profiles`: registro compartilhado, com políticas privadas do Travel preservadas.
- `social.profiles`: projeção social vinculada 1:1 ao mesmo ID, com username único, bio e estatísticas publicáveis. Não é uma segunda conta; permite separar campos públicos dos privados. Nome/cidade da projeção social não sobrescrevem silenciosamente preferências do Travel.
- O trigger `social_new_user` usa INSERT ON CONFLICT e suporta o trigger `on_auth_user_created` atual do Travel. Na instalação conjunta, aplique a base Travel antes da Social. Para uma base Social independente, aplique migrations Travel futuras de maneira reconciliada, pois a base Travel original usa CREATE TABLE sem IF NOT EXISTS.

O catálogo `social.destinations` está isolado porque o Travel local não oferece uma tabela compartilhada de destinos compatível. Uma migração futura pode introduzir IDs canônicos e adapters, sem comparar nomes livres para efetuar joins. `public.published_routes` existe no Travel, mas o Social não assume que todas as instâncias o tenham. O adapter é o ponto de ligação para respeitar as condições de publicação e de plano existentes.

## Dados exclusivamente sociais

Posts, mídias, follows, curtidas, comentários, salvos, coleções, hashtags, lugares marcados, destinos seguidos, notificações sociais, denúncias, bloqueios e métricas agregadas residem no schema `social`. Nunca se junta o feed a `public.trips.data` ou a documentos, hotéis, reservas e despesas.

PUBLIC/FOLLOWERS/PRIVATE é aplicado pelo PostgreSQL. Perfil privado foi explicitamente desativado até haver fluxo de aprovação. Mídias ficam em buckets privados e apenas usuários autorizados podem obter uma URL temporária. O autor pode ler seu rascunho; ele só entra no feed após `finalize_post` verificar a consistência de mídia.

## Sessão em voyra.com e social.voyra.com

Hoje, ambos podem usar a mesma conta ao apontar ao mesmo Supabase, mas os clientes do Travel inspecionados ainda não configuram `cookieOptions.domain`. Por padrão cada host conserva sua própria sessão.

Para compartilhar sessão futuramente:

1. Ambos devem usar o mesmo projeto Supabase, storage key/nome e convenções de `@supabase/ssr`.
2. Configure `Domain=.voyra.com`, `Path=/`, `Secure=true`, `SameSite=Lax` nos clientes SSR, browser e proxy **dos dois produtos**. No Social isso é habilitado por `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com`. O Travel requer a mesma alteração em seu próprio repositório.
3. Use HTTPS real nos dois hosts, configure redirect URLs de Auth e evite domínio de cookie em localhost.
4. Faça uma migração de cookies host-only antigos, evitando duas versões do mesmo cookie. Valide login, refresh simultâneo, expiração e logout nas duas abas.
5. Não salve tokens em query strings nem os transfira via links. O callback usa code exchange PKCE, com redirect interno fixo.

Um cookie de domínio amplia a superfície de confiança a todos os subdomínios. Restrinja controle de DNS e implantação. Se forem domínios registráveis diferentes, esse mecanismo não funciona: use um fluxo central de autenticação com redirects, não tente burlar regras de cookies.

## Contrato do adapter Travel

`lib/voyra-travel/index.ts` nunca importa código do outro repositório. Envia Bearer do próprio usuário, usa `cache: no-store`, timeout e validação de resposta. Sem `VOYRA_TRAVEL_API_URL`, lança `TravelUnavailable`.

| Função | Endpoint relativo ao adapter | Contrato |
| --- | --- | --- |
| getUserTrips | GET /social/trips | `[{id: uuid,name,destination,start_date}]`, apenas viagens futuras autorizadas |
| addPlaceToTrip | POST /social/trips/:id/places | `{postId,idempotencyKey}`; chave `tripId:postId` |
| openTrip | URL pública do Travel /viagens/:id | Navegação; o Travel revalida sessão e permissão |
| publishTrip | POST /social/published-trips | `{tripId,consent:true}`; projeção pública revisada |
| importRoute | POST /social/import-route | `{routeId}`; cópia sanitizada para viagem do usuário |

O serviço receptor deve verificar JWT, ownership da viagem, visibilidade do post, bloqueios, status de publicação e integridade do lugar. Deve garantir idempotência em transação, gravar só dados permitidos e retornar sucesso apenas após persistência. Não confie no `tripId` ou no texto do lugar enviados pelo browser. A parte receptora desses endpoints não existe ainda no Travel local; foi mantida como integração preparada, conforme pedido.

## Evolução sem vazamento

- Viagens públicas e diário: criar projeção publicada pelo proprietário com IDs de lugares aprovados; então substituir o CHECK que mantém `posts.trip_id` nulo. Não adicionar foreign key com leitura implícita do agregado privado.
- Rotas de criadores: consumir projeção `published_routes`, respeitar unpublish, planos e consentimento, e registrar eventos sem dados financeiros.
- IA: receber somente conteúdo que o usuário já pode ler, citar a comunidade e preservar atribuição de opinião. `OPENAI_API_KEY` é apenas variável reservada, sem chamadas implementadas.
- Moderação: provider assíncrono para texto/mídia e revisão humana. Não há auto-delete de conteúdo por heurística.
- Vídeo: upload em área temporária, job durável para transcoding/metadata/poster, promoção ao bucket final apenas após validação. O servidor de requests não faz transcoding.
- Métricas: agregados diários e deduplicação em janela/stream. O banco preparado não aceita gravações públicas de counters.
- Exclusão: coordenar filas Social/Travel/Storage e obrigações de retenção. O formulário atual registra uma solicitação, não chama admin.deleteUser.
- Mobile: reutilizar interfaces TypeScript e contrato HTTP. Sessão nativa deverá usar armazenamento seguro; cookies de subdomínio são estratégia para a web.

## Verificações e operação

As migrations são testadas com papéis SQL não privilegiados em PostgreSQL embarcado. Testes remotos de Auth, Storage, SMTP, sessão compartilhada, limites de upload do host e API receptora Travel continuam dependentes de staging. Antes de publicar: aplicar banco, configurar schemas expostos, buckets, URLs e secrets; executar os fluxos autenticados e definir operadores para denúncias e solicitações de conta. Não há deploy, alteração remota ou conta criada automaticamente por este repositório.

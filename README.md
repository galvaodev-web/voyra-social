# Voyra Social

**Viaje. Descubra. Compartilhe.** Uma comunidade feita para quem vive, planeja e compartilha viagens.

Aplicação independente em Next.js 16, React, TypeScript estrito, Tailwind CSS 4, Supabase Auth/PostgreSQL/Storage, Zod, React Hook Form e Lucide. Não modifica o repositório Voyra Travel.

## Executar

Requer Node.js 22.13+ e npm. Use uma versão LTS compatível com as dependências fixadas no lockfile.

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 3002
```

No PowerShell, use `Copy-Item .env.example .env.local`. Abra `http://localhost:3002` e ajuste `NEXT_PUBLIC_SITE_URL` para essa origem. Sem Supabase configurado, a aplicação exibe uma **vitrine de demonstração identificada**, com relatos e métricas ilustrativos. Ações não fingem persistência. Dados de demonstração nunca são inseridos automaticamente no banco.

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Os testes de navegador usam uma instância de produção exclusiva na porta 3217. Não reutilizam serviços de outros projetos. Instale o navegador com `npx playwright install chromium` se necessário. Rode o build antes dos E2E.

## Supabase

1. Use o **mesmo projeto Supabase do Voyra Travel** e as mesmas chaves públicas. Não crie outro universo de usuários.
2. Faça backup e valide em um ambiente de staging com o schema do Travel antes de executar migrations em produção.
3. Execute, em ordem, os arquivos em `supabase/migrations/`. A primeira migration cria o schema `social` e reutiliza `public.profiles.id → auth.users.id`. Se já houver `public.profiles`, sua estrutura deve ser compatível com o contrato documentado em `ARCHITECTURE.md`.
4. Em API Settings/Data API, inclua `social` nos schemas expostos. As migrations atribuem grants e RLS explicitamente. Nunca desative RLS para resolver erro de acesso.
5. Execute `supabase/seed.sql` para cadastrar o catálogo inicial de destinos. Ele contém destinos, sem posts, pessoas ou números fictícios.
6. Configure URL do site e redirect URLs do Auth, incluindo `http://localhost:3002/auth/callback` e `https://social.voyra.com/auth/callback`. Ative confirmação de e-mail e configure o provedor de e-mail para produção.
7. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e, **somente no servidor**, `SUPABASE_SERVICE_ROLE_KEY` para os uploads validados.

Não há credenciais no repositório. As migrations não foram aplicadas a um Supabase remoto por esta implementação.

## Storage e uploads

Buckets privados: `social-images` (10 MB), `social-videos` (50 MB), `avatars` (5 MB). A migration não abre buckets existentes. Verifique se buckets preexistentes preservam esses limites e continuam privados.

O servidor valida sessão, Origin, schema, quantidade, tamanho, MIME e assinatura binária. Imagens também são decodificadas com Sharp, limitadas a 40 MP, orientadas, reduzidas a até 1600 px e convertidas para WebP sem EXIF. Isso evita servir originais gigantes e remove metadados de localização das fotos. Até dez fotos ou um vídeo por post; no máximo 100 MB por envio. A publicação fica em DRAFT até a finalização transacional do banco. Falhas tentam remover o rascunho e os objetos enviados.

Vídeos usam player nativo com controles, mute e playsInline. MP4 e MOV dependem de codecs compatíveis com o navegador. O reconhecimento do contêiner não é uma auditoria completa do vídeo. Transcoding, stripping de metadados de vídeo, duração máxima, geração de poster e legendas devem ser implementados em worker antes de abrir uploads de vídeo a uma audiência ampla. Não há processamento pesado de vídeo dentro da request.

Os objetos recebem URLs assinadas por cinco minutos após verificação de RLS. Imagens reais já chegam reduzidas e usam `next/image` sem cache intermediário do otimizador, para não prolongar a exposição de URLs privadas; a vitrine usa otimização normal. Revogar visibilidade/bloquear usuário impede novos links, mas links anteriormente assinados podem durar até expirar. Não habilite cache público de páginas autenticadas.

Para hospedar o endpoint de upload, use um runtime Node e um ingress que aceite o limite declarado. Plataformas serverless com payloads pequenos exigem migrar para upload temporário assinado + worker de validação. Não libere escrita direta em buckets finais. Ainda falta um coletor periódico de objetos órfãos para falhas abruptas ou remoções de conta/post.

## Funcionalidades implementadas

- Cadastro e login Supabase com callback PKCE, edição de perfil público e logout.
- Feed com páginas de 12 posts e cursor composto `(created_at,id)`, carregamento incremental e seguindo cronológico.
- Publicação de imagem/carrossel, vídeo, texto, dica, avaliação e formatos textuais de diário/roteiro; legenda, hashtags, menções, destino, lugar e visibilidade.
- Curtir/descurtir, seguir/deixar de seguir, comentar/responder/excluir próprio comentário, salvar/remover, criar coleções e adicionar posts a coleções.
- Explorar, busca em publicações, pessoas e destinos, páginas públicas de destino/perfil/post, links compartilháveis e metadados Open Graph.
- Seguir destino, “Quero conhecer”, denúncias de post/comentário/perfil, bloqueio de usuários e notificações persistidas por triggers.
- Painel com totais reais do criador, solicitações de exportação/exclusão (fila pendente, não executadas automaticamente).
- Layout desktop de três colunas, navegação mobile, skeletons, estados vazios, foco visível e modais com foco nativo de dialog.

O botão “Adicionar ao meu roteiro” consulta o adapter Travel autenticado, oferece viagens e envia uma operação idempotente. Se o adapter não estiver configurado, mostra indisponibilidade sem afirmar que adicionou o lugar.

## Segurança e RLS

`social.can_view_post()` aplica PUBLIC/FOLLOWERS/PRIVATE, publicação e bloqueio bidirecional. Escritas verificam autoria. Constraints impedem self-follow, duplicatas e respostas vinculadas a outro post. Coleções, salvos e notificações são privados. Colunas administrativas não têm grants de atualização pelo usuário. Funções SECURITY DEFINER usam search_path vazio e grants restritos. O server usa a chave de serviço exclusivamente para upload validado; interações comuns mantêm o JWT do usuário e passam por RLS.

Triggers aplicam limites por hora: 15 posts, 60 comentários/follows, 20 denúncias e 150 para outras mutações cobertas. As tabelas internas de rate limiting não são acessíveis pelo cliente. Limites de borda por IP, proteção de Auth/bot e limpeza das janelas antigas devem ser configurados no deploy. Isso não substitui a proteção contra DDoS do provedor.

Coordenadas de posts e `trip_id` são obrigatoriamente nulos nesta fase; o vínculo de viagem depende de consentimento e contrato com Travel. Não existe leitura de `trips.data`, documentos, reservas ou despesas pelo feed.

## Feed, analytics e moderação

`lib/feed/rank.ts` usa recência, popularidade com escala logarítmica, salvamentos e afinidade. O ranking acontece **dentro de cada janela cronológica** para manter paginação determinística; ainda não é um ranking global personalizado. Preferências de criador e destino alimentam o serviço; interesses inferidos de curtidas/salvos e views serão adicionados depois. Filtros locais selecionam a janela carregada; não prometem uma busca geográfica “Perto”.

`lib/analytics` define os eventos previstos, sem enviar dados até configurar provedor/consentimento. `post_metrics_daily` reserva agregação de views; não cria uma linha por visualização. `lib/moderation` oferece o contrato de análise futura. Posts recebem PENDING, sem remoção automática baseada em IA. O dashboard administrativo de tratamento de denúncias ainda precisa ser construído; a fila já persiste denúncias.

## Integração com Travel

Veja `ARCHITECTURE.md`. `VOYRA_TRAVEL_API_URL` ativa o contrato descrito em `lib/voyra-travel`. Não implemente acesso por service role ao agregado privado de viagens para fazer esse botão funcionar. A autenticação é a mesma desde que ambos apontem ao mesmo Supabase; **SSO de sessão entre domínios não está pronto apenas por preencher a URL**.

## Testes e limites da validação

Vitest verifica validação, assinatura de mídia, ranking e as migrations reais em PostgreSQL WASM (PGlite). O harness cria schemas mínimos de Auth/Storage e papéis anon/authenticated para exercitar as políticas. Isso verifica RLS de posts, follow/unfollow, likes, comentários/respostas, bloqueios, salvos, coleções, destinos e grants. Não substitui testar PostgREST, SMTP, Storage e refresh token num Supabase de staging.

Playwright cobre navegação, busca, validação de publicação, comportamento explícito da demonstração e ausência de overflow em 320, 375, 390, 414, 768, 1024 e 1440 px. Autenticação real, upload remoto e integração Travel precisam de ambiente de staging com credenciais; não são apresentados como testados sem essa infraestrutura.

## Preparado, ainda não concluído

Publicação/importação de roteiros Travel, diário vinculado a viagens, mapa pessoal, solicitação/aprovação de follow privado, localização adiada, avatar por upload, bookmarks de lugar independente, processamento de solicitações de conta, moderação humana administrativa, IA, clima ao vivo, agregação de views, ranking global e monetização. Perfis privados ficam desativados no banco até existir aprovação de follow.

A PWA possui manifest, cor e ícone; não oferece cache offline de dados privados nem fila offline de uploads. Anúncios e pagamentos não estão implementados. Termos e privacidade são textos iniciais sobre os controles do produto e precisam do responsável legal/operacional e canal de atendimento antes de lançamento público.

## Organização

`app/` páginas, endpoints e metadata; `components/` UI por domínio; `lib/supabase/` sessão; `lib/feed/` leitura/ranking; `lib/voyra-travel/` adapter; `lib/moderation/` contratos; `types/` entidades; `supabase/` banco; `tests/` domínio, RLS e E2E. Contratos de domínio e endpoints podem ser consumidos por um cliente React Native futuro sem reaproveitar componentes DOM.

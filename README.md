# Sistema de Controle de Projetos

Aplicação web de gerenciamento de projetos e tarefas com quadros Kanban (inspirada no Trello).

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + componentes no estilo shadcn/ui
- **Prisma ORM**
- **SQLite** (desenvolvimento) / **PostgreSQL** (produção)

## Estrutura

```text
src/
├── app/                 # Rotas Next.js
├── components/          # UI e componentes de domínio
├── features/            # Módulos por domínio (auth, projects, ...)
├── hooks/
├── lib/                 # Prisma, utils, constants, errors
├── repositories/        # Acesso a dados (próximas fases)
├── schemas/             # Validação Zod (próximas fases)
├── services/            # Regras de negócio (próximas fases)
├── types/
└── generated/prisma/    # Cliente Prisma gerado
```

## Pré-requisitos

- Node.js 20+
- npm

## Configuração

```bash
cp .env.example .env
npm install
```

## Banco de dados

### Migration

```bash
npm run db:migrate
```

### Gerar cliente Prisma

```bash
npm run db:generate
```

### Seed (dados de desenvolvimento)

```bash
npm run db:seed
```

Credenciais do seed (apenas local):

| Usuário | Senha |
|---------|-------|
| `admin@example.com` | `admin123` |
| `maria@example.com` | `password123` |
| `joao@example.com` | `password123` |
| `ana@example.com` | `password123` |

## Executar

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Produção (Docker / Coolify)

O projeto usa **PostgreSQL** e vem com `Dockerfile` multi-stage + `docker-compose.yml`.

### Variáveis obrigatórias no Coolify

| Variável | Exemplo |
|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/sistema_projetos` |
| `AUTH_SECRET` | gere com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://seu-dominio.com` |
| `API_ALLOWED_ORIGINS` | `https://seu-dominio.com` |

### Deploy no Coolify (VPS) — recomendado

Use **Dockerfile + PostgreSQL separado** (mais estável no Coolify):

1. **New Resource → Database → PostgreSQL**
   - Anote usuário, senha, banco e a **Internal URL**
2. **New Resource → Application → GitHub** (`kbokleber/projetos`)
   - Build Pack: **Dockerfile** (não Docker Compose)
3. Em Environment Variables:

```env
DATABASE_URL=<Internal URL do Postgres do Coolify>
AUTH_SECRET=oFMkloKl0fvfpSR2EhpCAwH698TE49PNEqm/w1e7GH0=
NEXTAUTH_URL=https://projetos.kbosolucoes.com.br
API_ALLOWED_ORIGINS=https://projetos.kbosolucoes.com.br
```

4. No Coolify, **vincule** o banco à application (Connect / Link database), se a UI oferecer
5. Domínio: `projetos.kbosolucoes.com.br` · porta do container: **3000**
6. Deploy

O host em `DATABASE_URL` **não** pode ser `postgres` — use o host da Internal URL do Coolify (ex.: `xxxxx` ou `postgresql-xxxxx`).

### Opção B (Docker Compose)

Só funciona se **os dois** serviços (`app` e `postgres`) estiverem Running no mesmo stack. Se aparecer `Can't reach database server at postgres:5432`, o Compose do Coolify não está resolvendo o serviço — prefira a opção A acima.

Opcional (seed inicial): após o primeiro deploy, rode no terminal do container:
```bash
npx tsx prisma/seed.ts
```

### Dev local com Docker

```bash
# Sobe Postgres + app
docker compose up --build

# Ou só o Postgres (e roda a app com npm run dev)
docker compose up postgres -d
cp .env.example .env
# ajuste AUTH_SECRET no .env
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação TypeScript |
| `npm run db:migrate` | Aplicar migrations (dev) |
| `npm run db:migrate:deploy` | Aplicar migrations (prod) |
| `npm run db:seed` | Popular banco |
| `npm run db:studio` | Prisma Studio |
| `npm run api:verify` | Smoke ponta-a-ponta da API `/api/v1/*` |
| `npm run web:verify` | Smoke das páginas autenticadas |

## API Pública (v1)

`/api/v1/` aceita token `Bearer pk_live_…` (gerado em `/settings/api`).

Endpoints:
- `GET/POST /api/v1/projects` · `GET/PATCH/DELETE /api/v1/projects/{id}`
- `GET/POST /api/v1/projects/{id}/boards` · `GET /api/v1/boards/{id}`
- `GET/POST /api/v1/boards/{id}/columns` · `PATCH /api/v1/columns/{id}`
- `GET/POST /api/v1/tasks` · `GET/PATCH/DELETE /api/v1/tasks/{id}`
- `POST /api/v1/tasks/{id}/move` (move coluna/posição)
- `POST /api/v1/tasks/{id}/assignees` · `DELETE /api/v1/tasks/{id}/assignees/{userId}`
- `GET/POST /api/v1/tasks/{id}/comments`

Garantias:
- Resposta no contrato `{ success: true, data }` ou `{ success: false, error: { code, message } }`
- Rate limit: 100 req/min por token (em memória) com headers `X-RateLimit-*`
- `Idempotency-Key` em POST/PATCH/DELETE (TTL 24h)
- Suporte a `externalId`/`externalSource` em tasks
- Webhooks (em `/settings/webhooks`) com assinatura HMAC SHA-256

Documentação interativa em `/api/docs` (Swagger UI).
Especificação em `/api/openapi.json`.

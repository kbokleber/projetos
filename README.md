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

### Deploy no Coolify — app + banco no mesmo Project

#### Caminho recomendado (Docker Compose = 2 containers no mesmo recurso)

1. No Coolify: **Projects → New Project** (ex.: `Projetos`)
2. Dentro do project: **New Resource → Docker Compose**
3. Git: `kbokleber/projetos` · arquivo: `docker-compose.yml`
4. Domínio: `projetos.kbosolucoes.com.br`
5. **Serviço público** = `app` · **Porta** = `3000`
6. Environment Variables:

```env
DATABASE_URL=postgresql://projetos:projetos@postgres:5432/sistema_projetos
AUTH_SECRET=oFMkloKl0fvfpSR2EhpCAwH698TE49PNEqm/w1e7GH0=
NEXTAUTH_URL=https://projetos.kbosolucoes.com.br
API_ALLOWED_ORIGINS=https://projetos.kbosolucoes.com.br
```

7. Deploy — devem aparecer **dois** containers: `postgres` e `app`
8. Confira nos logs do `app`: `Iniciando Next.js` / `Ready`

> Se ainda aparecer `Can't reach ... postgres:5432`, o Coolify não subiu o serviço `postgres`. Nos detalhes do recurso Compose, confirme que **ambos** os services estão enabled/Running.

#### Alternativa (2 recursos no mesmo Project)

1. No mesmo Project: **Database → PostgreSQL**
2. No mesmo Project: **Application → Dockerfile**
3. Copie a **Internal URL** do Postgres para `DATABASE_URL` da app
4. Porta da app: `3000` · domínio: `projetos.kbosolucoes.com.br`

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

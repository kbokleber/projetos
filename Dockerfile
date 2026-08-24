# ─────────────────────────────────────────────────────────────
# Dockerfile multi-stage para Coolify / VPS
# Build: docker build -t sistema-projetos .
# Run:   docker compose up --build
# ─────────────────────────────────────────────────────────────

# 1) Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
# --ignore-scripts: evita o postinstall (prisma generate) que falha no Alpine
RUN npm ci --no-audit --no-fund --ignore-scripts

# 2) Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV AUTH_SECRET="build-time-secret-not-used-at-runtime-32chars"
ENV NEXTAUTH_URL="http://localhost:3000"
# Gera o client Prisma explicitamente com node (Linux)
RUN node node_modules/prisma/build/index.js generate
RUN node node_modules/next/dist/bin/next build

# 3) Runner — imagem final
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone do Next (server.js + .next + node_modules mínimo)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Remove o node_modules do standalone para substituí-lo pela versão completa
# do builder (que tem `effect`, `prisma` CLI, etc.)
RUN rm -rf /app/node_modules

# Dependências completas para o app + Prisma CLI rodar migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["docker-entrypoint.sh"]

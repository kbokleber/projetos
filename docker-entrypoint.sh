#!/bin/sh
# Aplica migrations do Prisma antes de iniciar o Next.js.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL não definida — abortando."
  exit 1
fi

echo "[entrypoint] Aplicando migrations do Prisma..."
# O Prisma CLI precisa resolver `@prisma/config` e `effect` que estão em
# /app/node_modules. NODE_PATH força o Node a procurar módulos nesses paths.
NODE_PATH=/app/node_modules node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando Next.js..."
exec node server.js

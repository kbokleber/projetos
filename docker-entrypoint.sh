#!/bin/sh
# Aplica migrations do Prisma antes de iniciar o Next.js.
# Espera o Postgres ficar acessível (útil no Coolify / compose).
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL não definida — abortando."
  exit 1
fi

echo "[entrypoint] Aguardando banco de dados..."
MAX_ATTEMPTS=30
ATTEMPT=1
until NODE_PATH=/app/node_modules node node_modules/prisma/build/index.js migrate deploy; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] Banco inacessível após ${MAX_ATTEMPTS} tentativas."
    echo "[entrypoint] Verifique DATABASE_URL. No Coolify, use a Internal URL do Postgres,"
    echo "[entrypoint] não o host 'postgres' (só existe no docker-compose)."
    exit 1
  fi
  echo "[entrypoint] Tentativa ${ATTEMPT}/${MAX_ATTEMPTS} falhou — aguardando 3s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 3
done

echo "[entrypoint] Iniciando Next.js..."
exec node server.js

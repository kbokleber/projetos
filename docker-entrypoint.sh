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

# Cria o primeiro admin se o banco estiver vazio (não apaga dados existentes)
if [ -f scripts/bootstrap-admin.ts ]; then
  echo "[entrypoint] Verificando usuário admin inicial..."
  NODE_PATH=/app/node_modules node node_modules/tsx/dist/cli.mjs scripts/bootstrap-admin.ts || \
    echo "[entrypoint] Aviso: bootstrap-admin falhou (pode rodar manualmente depois)."
fi

echo "[entrypoint] Iniciando Next.js..."
exec node server.js

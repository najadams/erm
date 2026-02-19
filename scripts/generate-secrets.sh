#!/bin/bash
# ============================================================
# Generate strong secrets for ERM-GIPC .env
# Usage:  ./scripts/generate-secrets.sh
#         ./scripts/generate-secrets.sh >> .env   (append directly)
# ============================================================

set -e

echo "# --- Generated Secrets ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ---"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "MEILI_MASTER_KEY=$(openssl rand -hex 24)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+')"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+')"
echo "REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+')"
echo ""
echo "# Paste the above into your .env file, replacing the 'changeme' values."

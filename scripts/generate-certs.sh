#!/bin/bash
# ============================================================
# Generate self-signed TLS certificate for development / internal use
#
# Usage:  ./scripts/generate-certs.sh
# Output: infra/ssl/cert.pem, infra/ssl/key.pem
# ============================================================

set -e

SSL_DIR="./infra/ssl"
mkdir -p "$SSL_DIR"

if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
  echo "⚠️  Certificates already exist in $SSL_DIR"
  read -p "Overwrite? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Skipped."
    exit 0
  fi
fi

echo "🔐 Generating self-signed certificate..."

openssl req -x509 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -sha256 -days 365 -nodes \
  -subj "/C=GH/ST=Greater-Accra/L=Accra/O=GIPC/OU=ERM/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✅ Certificate generated:"
echo "   Cert: $SSL_DIR/cert.pem"
echo "   Key:  $SSL_DIR/key.pem"
echo ""
echo "⚠️  This is a self-signed cert — browsers will show a security warning."
echo "   For production, use Let's Encrypt (certbot) or your organization's CA."

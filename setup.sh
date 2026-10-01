#!/bin/sh
# Genere un fichier .env avec des secrets aleatoires (jamais commite).
if [ -f .env ]; then echo ".env existe deja, rien a faire."; exit 0; fi
ADMIN_PWD=$(openssl rand -hex 8)
cat > .env <<ENV
POSTGRES_DB=tixora
POSTGRES_USER=tixora
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CORS_ORIGINS=http://localhost:8081,http://localhost:5173
APP_PUBLIC_URL=http://localhost:8081
ADMIN_EMAIL=admin@tixora.cm
ADMIN_PASSWORD=$ADMIN_PWD
SEED_DEMO=true
APP_TIMEZONE=Africa/Douala
ENV
echo ".env cree."
echo "Administrateur : admin@tixora.cm / $ADMIN_PWD (a changer en production)"

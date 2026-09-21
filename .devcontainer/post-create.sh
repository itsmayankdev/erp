#!/bin/bash
set -e
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f .env.local ]; then cp .env.example .env.local; fi
echo "ERP dev environment ready."
echo "Start PostgreSQL: docker compose up -d postgres"
echo "Then run: npx prisma migrate dev --name init"
echo "Then run: npm run db:seed"

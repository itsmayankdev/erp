#!/bin/bash
set -e
if [ ! -f .env ]; then
  cp .env.example .env
fi
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
echo "ERP dev environment ready."
echo "Start PostgreSQL: docker compose up -d postgres"
echo "The development server will synchronize the Prisma schema automatically."
echo "Then run: npm run db:seed"

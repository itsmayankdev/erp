# ERP — Steel Trading ERP

A centralized ERP foundation for B2B steel/surplus material trading.

## Architecture
- Next.js + TypeScript frontend
- PostgreSQL as the single source of truth
- Prisma ORM
- Redis reserved for background jobs/cache
- Modular monolith first; services can be extracted later

## Core business flow
Market intelligence → opportunity → deal → optional agreement → purchase → inventory → buyer → sale → dispatch → payment → profit.

## Data principle
All modules must reference shared master records. Customer, seller, buyer, material, deal and stock data must never be duplicated into isolated module-specific stores.

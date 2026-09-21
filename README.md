# ERP — Steel Trading OS

Centralized ERP for B2B steel, surplus and dead-stock trading.

## Business flow

**Market intelligence → opportunity → buyer demand → deal → optional agreement → purchase → inventory → sales order → dispatch → payment → profit**

The **Deal** is the central business object. A purchase can happen before a buyer is known; that inventory remains available/unallocated until a buyer is committed.

## Procurement types

- Surplus / Dead Stock Purchase
- Direct Corporate Purchase
- Regular Supplier Purchase
- Stock / Inventory Purchase
- Future: Import, Tender, Contract

## Architecture

- Next.js 15 + TypeScript
- PostgreSQL — centralized source of truth
- Prisma ORM
- REST API through Next.js Route Handlers
- Zod request validation
- Redis/BullMQ reserved for background jobs
- S3-compatible object storage planned for documents
- Modular monolith first

## Current repository layers

### Static GitHub Pages preview
`index.html` + `app.js`

This is only a UI/demo layer. It uses browser-local preview data and does **not** replace the production database.

### Production application
Next.js application routes + Prisma + PostgreSQL.

API foundations currently include:

- `GET /api/health`
- `GET /api/dashboard?companyId=...`
- `GET /api/deals?companyId=...`
- `POST /api/deals`

## Database setup

Create a PostgreSQL database and set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/steel_erp"
```

Then:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Prisma Studio:

```bash
npm run db:studio
```

Health check:

```text
/api/health
```

## Data model

The schema now covers:

- Companies
- Users / roles
- Buyers
- Sellers
- Materials
- Warehouses
- Market opportunities
- Buyer demands
- Deals
- Agreements
- Purchases
- Inventory / stock
- Sales orders
- Payments
- Documents
- Price intelligence
- Audit logs

## Important data rule

Do not duplicate master data inside individual modules.

A Buyer, Seller, Material, Deal and Warehouse should have one canonical record and be referenced everywhere else.

## Roadmap

1. Production authentication + RBAC
2. PostgreSQL migration and seed
3. Deal CRUD + workflow
4. Opportunity ↔ Demand matching
5. Purchase receiving → inventory
6. Inventory reservation → sales order
7. Dispatch and delivery
8. Payment allocation
9. Agreement center
10. Profitability and variance
11. Documents
12. Audit trail and notifications
13. Reports
14. Mobile operations app

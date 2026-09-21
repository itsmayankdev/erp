import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DealWorkspace from "@/components/DealWorkspace";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      seller: true, buyer: true, material: true, opportunity: true, demand: true,
      agreements: { orderBy: { updatedAt: "desc" } },
      purchases: { include: { warehouse: true, dealSource: { include: { seller: true } } }, orderBy: { createdAt: "desc" } },
      salesOrders: { orderBy: { createdAt: "desc" } },
      stocks: { include: { warehouse: true, stockAllocations: true }, orderBy: { createdAt: "desc" } },
      dealSources: { include: { seller: true, opportunity: true }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!deal) notFound();

  const payments = await prisma.payment.findMany({
    where: {
      companyId: deal.companyId,
      OR: [
        { purchaseId: { in: deal.purchases.map(p => p.id) } },
        { salesOrderId: { in: deal.salesOrders.map(s => s.id) } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  const [buyers, sellers, materials, warehouses] = await Promise.all([
    prisma.buyer.findMany({ where: { companyId: deal.companyId }, select: { id: true, name: true } }),
    prisma.seller.findMany({ where: { companyId: deal.companyId }, select: { id: true, name: true } }),
    prisma.material.findMany({ where: { companyId: deal.companyId }, select: { id: true, name: true, unit: true } }),
    prisma.warehouse.findMany({ where: { companyId: deal.companyId }, select: { id: true, name: true } })
  ]);

  return (
    <main className="erpPage">
      <header className="moduleHeader">
        <div>
          <p className="eyebrow">DEAL WORKSPACE</p>
          <h1>{deal.id.slice(0, 12)}</h1>
          <p className="muted">{deal.material.name} · {deal.dealSources?.length > 1 ? "Multiple suppliers" : deal.seller.name} → {deal.buyer?.name ?? "Buyer not matched"}</p>
        </div>
        <Link className="secondaryBtn" href="/deals">← All Deals</Link>
      </header>
      <DealWorkspace
        deal={JSON.parse(JSON.stringify(deal))}
        payments={JSON.parse(JSON.stringify(payments))}
        masters={JSON.parse(JSON.stringify({ buyers, sellers, materials, warehouses }))}
      />
    </main>
  );
}
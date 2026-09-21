import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const [openDeals, opportunities, demands, inventory, receivables, payables, exposure] = await Promise.all([
    prisma.deal.count({ where: { companyId, status: { not: "Closed" } } }),
    prisma.opportunity.count({ where: { companyId, status: { not: "Closed" } } }),
    prisma.buyerDemand.count({ where: { companyId, status: { not: "Closed" } } }),
    prisma.stock.findMany({ where: { companyId }, select: { quantity: true, unitCost: true, reservedQty: true, status: true } }),
    prisma.payment.aggregate({ where: { companyId, type: "Receivable", status: { not: "Paid" } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { companyId, type: "Payable", status: { not: "Paid" } }, _sum: { amount: true } }),
    prisma.deal.count({ where: { companyId, capitalExposure: true } })
  ]);

  const inventoryValue = inventory.reduce((sum, x) => sum + Number(x.quantity) * Number(x.unitCost ?? 0), 0);
  return NextResponse.json({
    openDeals, opportunities, demands, capitalExposure: exposure,
    inventoryValue,
    receivables: Number(receivables._sum.amount ?? 0),
    payables: Number(payables._sum.amount ?? 0)
  });
}

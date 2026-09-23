import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const [openDeals, opportunities, demands, inventory, receipts, payments, exposure] = await Promise.all([
    prisma.deal.count({ where: { companyId, status: { not: "Closed" } } }),
    prisma.opportunity.count({ where: { companyId, status: { notIn: ["Closed","Cancelled","Converted"] } } }),
    prisma.buyerDemand.count({ where: { companyId, status: { notIn: ["Closed","Cancelled","Fulfilled"] } } }),
    prisma.stock.findMany({ where: { companyId, status: { not: "Sold" } }, select: { quantity: true, unitCost: true } }),
    prisma.payment.aggregate({ where: { companyId, type: { in: ["Received","RECEIPT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { companyId, type: { in: ["Paid","PAYMENT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.deal.count({ where: { companyId, capitalExposure: true, status: { not: "Completed" } } })
  ]);

  const inventoryValue = inventory.reduce((sum, x) => sum + Number(x.quantity) * Number(x.unitCost ?? 0), 0);
  return NextResponse.json({
    openDeals, opportunities, demands, capitalExposure: exposure,
    inventoryValue,
    receivables: Number(receipts._sum.amount ?? 0),
    payables: Number(payments._sum.amount ?? 0)
  });
}
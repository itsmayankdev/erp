import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const [openDeals, opportunities, demands, inventory, purchases, salesOrders, paidPayments, receivedPayments, exposure] = await Promise.all([
    prisma.deal.count({ where: { companyId, status: { notIn: ["Closed","Completed","Cancelled"] } } }),
    prisma.opportunity.count({ where: { companyId, status: { notIn: ["Closed","Cancelled","Converted"] } } }),
    prisma.buyerDemand.count({ where: { companyId, status: { notIn: ["Closed","Cancelled","Fulfilled"] } } }),
    prisma.stock.findMany({ where: { companyId, status: { not: "Sold" } }, select: { quantity: true, unitCost: true } }),
    prisma.purchase.findMany({ where: { companyId, status: { not: "Cancelled" } }, select: { quantity:true, rate:true, freightCost:true, loadingCost:true, otherCost:true } }),
    prisma.salesOrder.findMany({ where: { companyId, status: { not: "Cancelled" } }, select: { quantity:true, rate:true } }),
    prisma.payment.aggregate({ where: { companyId, type: { in: ["Paid","PAYMENT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { companyId, type: { in: ["Received","RECEIPT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.deal.count({ where: { companyId, capitalExposure: true, status: { notIn: ["Completed","Closed","Cancelled"] } } })
  ]);

  const inventoryValue = inventory.reduce((sum,x)=>sum+Number(x.quantity)*Number(x.unitCost??0),0);
  const purchaseValue = purchases.reduce((sum,p)=>sum+Number(p.quantity)*Number(p.rate)+Number(p.freightCost)+Number(p.loadingCost)+Number(p.otherCost),0);
  const salesValue = salesOrders.reduce((sum,s)=>sum+Number(s.quantity)*Number(s.rate),0);

  return NextResponse.json({
    openDeals, opportunities, demands, capitalExposure: exposure, inventoryValue,
    receivables: Math.max(0,salesValue-Number(receivedPayments._sum.amount??0)),
    payables: Math.max(0,purchaseValue-Number(paidPayments._sum.amount??0))
  });
}

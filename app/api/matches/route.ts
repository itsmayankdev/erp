import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const [opportunities, demands] = await Promise.all([
    prisma.opportunity.findMany({
      where: { companyId, status: { in: ["Hot", "Open", "Watch"] } },
      include: { seller: true, material: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.buyerDemand.findMany({
      where: { companyId, status: { in: ["Urgent", "Open"] } },
      include: { buyer: true, material: true },
      orderBy: { requiredBy: "asc" }
    })
  ]);

  const matches = opportunities.flatMap(op => demands
    .filter(dm => dm.materialId === op.materialId && Number(op.quantity) >= Number(dm.quantity))
    .map(dm => {
      const buy = Number(op.askingRate ?? 0);
      const sell = Number(dm.targetRate ?? op.estimatedMarketRate ?? 0);
      const spread = sell - buy;
      return {
        opportunityId: op.id,
        demandId: dm.id,
        material: op.material.name,
        seller: op.seller.name,
        buyer: dm.buyer.name,
        quantity: Math.min(Number(op.quantity), Number(dm.quantity)),
        buyRate: buy,
        targetSellRate: sell,
        spreadPerKg: spread,
        estimatedGrossSpread: spread * Math.min(Number(op.quantity), Number(dm.quantity)),
        signal: spread > 0 ? "MATCH" : "REVIEW"
      };
    }));

  return NextResponse.json(matches);
}

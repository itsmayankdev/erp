import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const dealSchema = z.object({
  companyId: z.string().min(1), sellerId: z.string().min(1), buyerId: z.string().optional().nullable(),
  materialId: z.string().min(1), opportunityId: z.string().optional().nullable(), demandId: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(), buyRate: z.coerce.number().nonnegative(),
  sellRate: z.coerce.number().nonnegative().optional().nullable(),
  freightCost: z.coerce.number().nonnegative().default(0), loadingCost: z.coerce.number().nonnegative().default(0),
  otherCost: z.coerce.number().nonnegative().default(0), procurementType: z.string().min(1),
  status: z.string().default("Opportunity"), sellerCommitted: z.boolean().default(false), buyerCommitted: z.boolean().default(false)
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const deals = await prisma.deal.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, include: { seller: true, buyer: true, material: true, opportunity: true, demand: true } });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  try {
    const body = dealSchema.parse(await req.json());
    const expectedLandedCost = body.quantity * body.buyRate + body.freightCost + body.loadingCost + body.otherCost;
    const expectedRevenue = body.sellRate ? body.quantity * body.sellRate : null;
    const expectedProfit = expectedRevenue === null ? null : expectedRevenue - expectedLandedCost;
    const expectedMargin = expectedRevenue && expectedRevenue > 0 ? (expectedProfit! / expectedRevenue) * 100 : null;
    const deal = await prisma.deal.create({
      data: { ...body, expectedLandedCost, expectedProfit, expectedMargin, capitalExposure: body.sellerCommitted && !body.buyerCommitted },
      include: { seller: true, buyer: true, material: true }
    });
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid deal payload", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

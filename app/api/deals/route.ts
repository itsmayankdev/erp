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
    const refs = await Promise.all([
      prisma.seller.findFirst({ where: { id: body.sellerId, companyId: body.companyId } }),
      body.buyerId ? prisma.buyer.findFirst({ where: { id: body.buyerId, companyId: body.companyId } }) : Promise.resolve(null),
      prisma.material.findFirst({ where: { id: body.materialId, companyId: body.companyId } }),
      body.opportunityId ? prisma.opportunity.findFirst({ where: { id: body.opportunityId, companyId: body.companyId } }) : Promise.resolve(null),
      body.demandId ? prisma.buyerDemand.findFirst({ where: { id: body.demandId, companyId: body.companyId } }) : Promise.resolve(null)
    ]);
    if (!refs[0]) throw new Error("Seller does not belong to this company.");
    if (body.buyerId && !refs[1]) throw new Error("Buyer does not belong to this company.");
    if (!refs[2]) throw new Error("Material does not belong to this company.");
    if (body.opportunityId && (!refs[3] || refs[3].materialId !== body.materialId || refs[3].sellerId !== body.sellerId)) throw new Error("Opportunity is invalid for this deal.");
    if (body.demandId && (!refs[4] || refs[4].materialId !== body.materialId || (body.buyerId && refs[4].buyerId !== body.buyerId))) throw new Error("Buyer demand is invalid for this deal.");
    const expectedLandedCost = body.quantity * body.buyRate + body.freightCost + body.loadingCost + body.otherCost;
    const expectedRevenue = body.sellRate != null ? body.quantity * body.sellRate : null;
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Deal id is required" }, { status: 400 });
    const existing = await prisma.deal.findUnique({ where: { id }, include: { company: true } });
    if (!existing) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const quantity = body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity);
    const buyRate = body.buyRate !== undefined ? Number(body.buyRate) : Number(existing.buyRate);
    const sellRate = body.sellRate === "" || body.sellRate === null ? null : body.sellRate !== undefined ? Number(body.sellRate) : Number(existing.sellRate ?? 0);
    const freightCost = body.freightCost !== undefined ? Number(body.freightCost) : Number(existing.freightCost);
    const loadingCost = body.loadingCost !== undefined ? Number(body.loadingCost) : Number(existing.loadingCost);
    const otherCost = body.otherCost !== undefined ? Number(body.otherCost) : Number(existing.otherCost);
    const expectedLandedCost = quantity * buyRate + freightCost + loadingCost + otherCost;
    const expectedRevenue = sellRate === null ? null : quantity * sellRate;
    const expectedProfit = expectedRevenue === null ? null : expectedRevenue - expectedLandedCost;
    const expectedMargin = expectedRevenue && expectedRevenue > 0 ? (expectedProfit! / expectedRevenue) * 100 : null;
    const allowed = ["sellerId","buyerId","materialId","quantity","buyRate","sellRate","procurementType","status","sellerCommitted","buyerCommitted","freightCost","loadingCost","otherCost"];
    const data:any = {};
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];
    data.quantity=quantity; data.buyRate=buyRate; data.sellRate=sellRate;
    data.freightCost=freightCost; data.loadingCost=loadingCost; data.otherCost=otherCost;
    data.expectedLandedCost=expectedLandedCost; data.expectedProfit=expectedProfit; data.expectedMargin=expectedMargin;
    const sellerCommitted = body.sellerCommitted !== undefined ? Boolean(body.sellerCommitted) : existing.sellerCommitted;
    const buyerCommitted = body.buyerCommitted !== undefined ? Boolean(body.buyerCommitted) : existing.buyerCommitted;
    data.capitalExposure = sellerCommitted && !buyerCommitted;
    const deal=await prisma.deal.update({where:{id},data,include:{seller:true,buyer:true,material:true}});
    return NextResponse.json(deal);
  } catch (e) {
    return NextResponse.json({ error: "Deal could not be updated", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

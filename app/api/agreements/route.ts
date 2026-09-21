import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1), dealId: z.string().min(1), side: z.enum(["SELLER","BUYER"]),
  status: z.enum(["Draft","Sent","Confirmed","Signed","Expired","Cancelled"]).default("Draft"),
  validFrom: z.coerce.date().optional(), validUntil: z.coerce.date().optional(),
  termsJson: z.record(z.any()).optional(), documentUrl: z.string().optional()
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  return NextResponse.json(await prisma.agreement.findMany({
    where: { companyId, ...(dealId ? { dealId } : {}) }, include: { deal: true }, orderBy: { updatedAt: "desc" }
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const agreement = await prisma.agreement.create({ data: body });
    await prisma.deal.update({
      where: { id: body.dealId },
      data: body.side === "SELLER" ? { agreementSeller: true } : { agreementBuyer: true }
    });
    return NextResponse.json(agreement, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Agreement could not be created", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1),
  dealId: z.string().min(1),
  side: z.enum(["SELLER","BUYER"]),
  status: z.enum(["Draft","Sent","Confirmed","Signed","Expired","Cancelled"]).default("Draft"),
  validFrom: z.coerce.date().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  termsJson: z.record(z.any()).optional(),
  documentUrl: z.string().optional().nullable()
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  return NextResponse.json(await prisma.agreement.findMany({
    where: { companyId, ...(dealId ? { dealId } : {}) },
    include: { deal: { include: { seller: true, buyer: true, material: true } } },
    orderBy: { updatedAt: "desc" }
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const agreement = await prisma.$transaction(async tx => {
      const latest = await tx.agreement.findFirst({
        where: { companyId: body.companyId, dealId: body.dealId, side: body.side },
        orderBy: { version: "desc" },
        select: { version: true }
      });
      const created = await tx.agreement.create({
        data: {
          ...body,
          version: (latest?.version || 0) + 1,
          signedAt: body.status === "Signed" ? new Date() : null
        }
      });
      await tx.deal.update({
        where: { id: body.dealId },
        data: body.side === "SELLER" ? { agreementSeller: true } : { agreementBuyer: true }
      });
      return created;
    });
    return NextResponse.json(agreement, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Agreement could not be created", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = z.object({
      id: z.string().min(1),
      status: z.enum(["Draft","Sent","Confirmed","Signed","Expired","Cancelled"]).optional(),
      validFrom: z.coerce.date().optional().nullable(),
      validUntil: z.coerce.date().optional().nullable(),
      termsJson: z.record(z.any()).optional(),
      documentUrl: z.string().optional().nullable()
    }).parse(await req.json());

    const agreement = await prisma.agreement.update({
      where: { id: body.id },
      data: {
        ...(body.status ? { status: body.status, ...(body.status === "Signed" ? { signedAt: new Date() } : {}) } : {}),
        ...(body.validFrom !== undefined ? { validFrom: body.validFrom } : {}),
        ...(body.validUntil !== undefined ? { validUntil: body.validUntil } : {}),
        ...(body.termsJson !== undefined ? { termsJson: body.termsJson } : {}),
        ...(body.documentUrl !== undefined ? { documentUrl: body.documentUrl } : {})
      }
    });
    return NextResponse.json(agreement);
  } catch (e) {
    return NextResponse.json({ error: "Agreement could not be updated", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

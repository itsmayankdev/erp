import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1), dealId: z.string().optional().nullable(), sellerId: z.string().min(1),
  materialId: z.string().min(1), warehouseId: z.string().optional().nullable(), reference: z.string().min(1),
  purchaseType: z.string().min(1), quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative(),
  freightCost: z.coerce.number().nonnegative().default(0), loadingCost: z.coerce.number().nonnegative().default(0),
  otherCost: z.coerce.number().nonnegative().default(0), status: z.string().default("Draft"),
  expectedDate: z.coerce.date().optional()
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  return NextResponse.json(await prisma.purchase.findMany({
    where: { companyId }, include: { seller: true, material: true, warehouse: true, deal: true },
    orderBy: { createdAt: "desc" }
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const purchase = await prisma.$transaction(async tx => {
      const row = await tx.purchase.create({ data: body });
      if (body.status === "Received") {
        await tx.stock.create({
          data: {
            companyId: body.companyId, materialId: body.materialId, dealId: body.dealId ?? null,
            warehouseId: body.warehouseId ?? null, quantity: body.quantity,
            unitCost: body.rate, status: "Available"
          }
        });
      }
      return row;
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid purchase payload", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

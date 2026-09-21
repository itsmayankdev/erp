import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1), dealId: z.string().optional().nullable(), buyerId: z.string().min(1),
  materialId: z.string().min(1), reference: z.string().min(1), quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(), status: z.string().default("Planned"), dispatchDate: z.coerce.date().optional()
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  return NextResponse.json(await prisma.salesOrder.findMany({
    where: { companyId }, include: { buyer: true, material: true, deal: true },
    orderBy: { createdAt: "desc" }
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const order = await prisma.$transaction(async tx => {
      const stock = await tx.stock.findFirst({
        where: { companyId: body.companyId, materialId: body.materialId, status: { in: ["Available", "Reserved"] },
          quantity: { gte: body.quantity } },
        orderBy: { createdAt: "asc" }
      });
      if (!stock) throw new Error("Insufficient available stock for this material");
      await tx.stock.update({
        where: { id: stock.id },
        data: { reservedQty: { increment: body.quantity }, status: "Reserved" }
      });
      return tx.salesOrder.create({ data: body });
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Sales order could not be created", detail: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

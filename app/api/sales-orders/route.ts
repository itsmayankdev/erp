import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  buyerId: z.string().min(1),
  materialId: z.string().min(1),
  reference: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  status: z.string().default("Planned"),
  dispatchDate: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId)
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  return NextResponse.json(
    await prisma.salesOrder.findMany({
      where: { companyId },
      include: {
        buyer: true,
        material: true,
        deal: true,
        stockAllocations: { include: { stock: { include: { warehouse: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const order = await prisma.$transaction(async tx => {
      const stocks = await tx.stock.findMany({
        where: {
          companyId: body.companyId,
          materialId: body.materialId,
          status: { in: ["Available", "Reserved", "Incoming"] },
        },
        include: { warehouse: true },
        orderBy: { createdAt: "asc" },
      });

      let remaining = body.quantity;
      const usable = stocks
        .map(stock => ({
          stock,
          available: Number(stock.quantity) - Number(stock.reservedQty),
        }))
        .filter(item => item.available > 0);

      const totalAvailable = usable.reduce((sum, item) => sum + item.available, 0);

      if (totalAvailable + 0.0001 < body.quantity) {
        throw new Error(
          `Insufficient available stock. Required ${body.quantity}, available ${totalAvailable}.`
        );
      }

      const created = await tx.salesOrder.create({ data: body });

      // Allocate from actual company-owned stock lots, oldest first.
      // Each row is retained as an audit trail of exactly which stock/warehouse was used.
      for (const item of usable) {
        if (remaining <= 0) break;

        const take = Math.min(remaining, item.available);

        await tx.stock.update({
          where: { id: item.stock.id },
          data: {
            reservedQty: { increment: take },
            status: "Reserved",
          },
        });

        await tx.stockAllocation.create({
          data: {
            companyId: body.companyId,
            stockId: item.stock.id,
            salesOrderId: created.id,
            quantity: take,
            warehouseId: item.stock.warehouseId,
            status: "Reserved",
          },
        });

        remaining -= take;
      }

      return tx.salesOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          buyer: true,
          material: true,
          deal: true,
          stockAllocations: {
            include: { stock: { include: { warehouse: true } } },
          },
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Sales order could not be created",
        detail: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

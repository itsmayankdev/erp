import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  dealSourceId: z.string().optional().nullable(),
  sellerId: z.string().min(1),
  materialId: z.string().min(1),
  warehouseId: z.string().optional().nullable(),
  reference: z.string().min(1),
  purchaseType: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  freightCost: z.coerce.number().nonnegative().default(0),
  loadingCost: z.coerce.number().nonnegative().default(0),
  otherCost: z.coerce.number().nonnegative().default(0),
  status: z.string().default("Draft"),
  expectedDate: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  return NextResponse.json(await prisma.purchase.findMany({
    where: { companyId },
    include: { seller: true, material: true, warehouse: true, deal: true, dealSource: { include: { seller: true } } },
    orderBy: { createdAt: "desc" }
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const purchase = await prisma.$transaction(async tx => {
      let source: any = null;

      const [seller, material, warehouse] = await Promise.all([
        tx.seller.findFirst({ where: { id: body.sellerId, companyId: body.companyId } }),
        tx.material.findFirst({ where: { id: body.materialId, companyId: body.companyId } }),
        body.warehouseId ? tx.warehouse.findFirst({ where: { id: body.warehouseId, companyId: body.companyId } }) : Promise.resolve(null)
      ]);
      if (!seller) throw new Error("Seller does not belong to this company.");
      if (!material) throw new Error("Material does not belong to this company.");
      if (body.warehouseId && !warehouse) throw new Error("Warehouse does not belong to this company.");

      if (body.dealSourceId) {
        source = await tx.dealSource.findFirst({
          where: { id: body.dealSourceId, companyId: body.companyId },
          include: { deal: true, seller: true }
        });

        if (!source) throw new Error("Supply source not found.");

        if (body.dealId && source.dealId !== body.dealId) {
          throw new Error("Supply source does not belong to this deal.");
        }

        if (body.sellerId !== source.sellerId) {
          throw new Error("Purchase seller does not match the selected supply source.");
        }

        if (body.materialId !== source.deal.materialId) {
          throw new Error("Purchase material does not match the deal.");
        }

        const received = await tx.purchase.aggregate({
          where: { dealSourceId: source.id, status: { in: ["Received", "Partially Received"] } },
          _sum: { quantity: true }
        });

        const alreadyReceived = Number(received._sum.quantity ?? 0);
        const sourceQuantity = Number(source.quantity);

        if (alreadyReceived + body.quantity > sourceQuantity + 0.0001) {
          throw new Error(
            `Cannot receive ${body.quantity}. Source has only ${Math.max(0, sourceQuantity - alreadyReceived)} remaining to receive.`
          );
        }
      } else if (body.dealId) {
        const deal = await tx.deal.findFirst({
          where: { id: body.dealId, companyId: body.companyId }
        });
        if (!deal) throw new Error("Deal not found.");
        if (deal.materialId !== body.materialId) throw new Error("Purchase material does not match the deal.");
      }

      const receivedAt = body.status === "Received" ? new Date() : undefined;

      const row = await tx.purchase.create({
        data: {
          companyId: body.companyId,
          dealId: body.dealId ?? null,
          dealSourceId: body.dealSourceId ?? null,
          sellerId: body.sellerId,
          materialId: body.materialId,
          warehouseId: body.warehouseId ?? null,
          reference: body.reference,
          purchaseType: body.purchaseType,
          quantity: body.quantity,
          rate: body.rate,
          freightCost: body.freightCost,
          loadingCost: body.loadingCost,
          otherCost: body.otherCost,
          status: body.status,
          expectedDate: body.expectedDate,
          receivedAt
        }
      });

      if (body.status === "Received") {
        const stock = await tx.stock.create({
          data: {
            companyId: body.companyId,
            materialId: body.materialId,
            dealId: body.dealId ?? null,
            purchaseId: row.id,
            warehouseId: body.warehouseId ?? null,
            quantity: body.quantity,
            unitCost: (body.quantity * body.rate + body.freightCost + body.loadingCost + body.otherCost) / body.quantity,
            status: "Available"
          }
        });

        await tx.auditLog.create({
          data: {
            companyId: body.companyId,
            action: "PURCHASE_RECEIVED",
            entity: "Purchase",
            entityId: row.id,
            after: {
              purchaseId: row.id,
              dealId: body.dealId ?? null,
              dealSourceId: body.dealSourceId ?? null,
              sellerId: body.sellerId,
              materialId: body.materialId,
              quantity: body.quantity,
              rate: body.rate,
              stockId: stock.id,
              warehouseId: body.warehouseId ?? null
            }
          }
        });

        if (body.dealId) {
          const deal = await tx.deal.findUnique({
            where: { id: body.dealId },
            include: { dealSources: true, purchases: true }
          });

          if (deal) {
            const targetQty = Number(deal.quantity);
            const receivedQty = deal.purchases
              .filter(p => p.status === "Received")
              .reduce((sum, p) => sum + Number(p.quantity), 0) + body.quantity;

            await tx.deal.update({
              where: { id: body.dealId },
              data: {
                status: receivedQty + 0.0001 >= targetQty ? "Purchased" : "Partially Purchased"
              }
            });
          }
        }
      }

      return tx.purchase.findUniqueOrThrow({
        where: { id: row.id },
        include: { seller: true, material: true, warehouse: true, dealSource: { include: { seller: true } } }
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json(purchase, { status: 201 });
  } catch (e) {
    return NextResponse.json({
      error: "Purchase could not be created",
      detail: e instanceof Error ? e.message : "Unknown error"
    }, { status: 400 });
  }
}

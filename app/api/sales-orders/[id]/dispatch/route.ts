import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async tx => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { stockAllocations: true, material: true },
      });

      if (!order) throw new Error("Sales order not found.");
      if (order.status === "Dispatched" || order.status === "Delivered") return order;
      if (!order.stockAllocations.length) {
        throw new Error("No company stock allocation is linked to this sales order.");
      }

      const totalAllocated = order.stockAllocations.reduce(
        (sum, allocation) => sum + Number(allocation.quantity),
        0
      );

      if (totalAllocated + 0.0001 < Number(order.quantity)) {
        throw new Error(
          `Only ${totalAllocated} ${order.material.unit} is allocated against an order for ${Number(order.quantity)}.`
        );
      }

      for (const allocation of order.stockAllocations) {
        if (allocation.status !== "Reserved") continue;

        const stock = await tx.stock.findUnique({ where: { id: allocation.stockId } });
        if (!stock) throw new Error("A linked stock lot no longer exists.");

        const reserved = Number(stock.reservedQty);
        const quantity = Number(stock.quantity);
        const used = Number(allocation.quantity);

        if (reserved + 0.0001 < used || quantity + 0.0001 < used) {
          throw new Error("Stock changed after reservation. Dispatch was stopped to protect inventory.");
        }

        const remainingQty = quantity - used;
        const remainingReserved = reserved - used;

        await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: remainingQty,
            reservedQty: remainingReserved,
            status:
              remainingQty <= 0.0001
                ? "Sold"
                : remainingReserved > 0
                  ? "Reserved"
                  : "Available",
          },
        });

        await tx.stockAllocation.update({
          where: { id: allocation.id },
          data: { status: "Dispatched", releasedAt: new Date() },
        });
      }

      return tx.salesOrder.update({
        where: { id },
        data: { status: "Dispatched", dispatchDate: new Date() },
        include: {
          buyer: true,
          material: true,
          stockAllocations: {
            include: { stock: { include: { warehouse: true } } },
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Dispatch failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

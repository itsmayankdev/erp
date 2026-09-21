import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const demandId = String(body.demandId || "");
  const allocations: Array<{ opportunityId: string; quantity: number }> =
    Array.isArray(body.allocations) ? body.allocations : [];

  if (!demandId || allocations.length < 2) {
    return NextResponse.json(
      { error: "Select at least two supply sources for a combined deal." },
      { status: 400 }
    );
  }

  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    return NextResponse.json({ error: "Company not initialized" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const demand = await tx.buyerDemand.findFirst({
        where: { id: demandId, companyId: company.id },
        include: { buyer: true, material: true },
      });

      if (!demand) throw new Error("Buyer requirement not found.");

      const remainingDemand =
        Number(demand.quantity) - Number(demand.matchedQuantity || 0);

      const cleanAllocations = allocations
        .map(a => ({
          opportunityId: String(a.opportunityId || ""),
          quantity: Number(a.quantity || 0),
        }))
        .filter(a => a.opportunityId && a.quantity > 0);

      const requested = cleanAllocations.reduce((n, a) => n + a.quantity, 0);

      if (cleanAllocations.length < 2) {
        throw new Error("At least two valid supply sources are required.");
      }

      if (requested > remainingDemand + 0.0001) {
        throw new Error(
          `Allocation of ${requested} exceeds the remaining buyer requirement of ${remainingDemand}.`
        );
      }

      const sources: Array<{
        opportunityId: string;
        sellerId: string;
        sellerName: string;
        materialId: string;
        quantity: number;
        buyRate: number;
        location: string | null;
      }> = [];

      for (const allocation of cleanAllocations) {
        const opportunity = await tx.opportunity.findFirst({
          where: { id: allocation.opportunityId, companyId: company.id },
          include: { seller: true, material: true },
        });

        if (!opportunity) {
          throw new Error("One of the selected supply records no longer exists.");
        }

        if (opportunity.materialId !== demand.materialId) {
          throw new Error("All selected supplies must be for the same material.");
        }

        const available =
          Number(opportunity.quantity) -
          Number(opportunity.allocatedQuantity || 0);

        if (allocation.quantity > available + 0.0001) {
          throw new Error(
            `${opportunity.seller.name} only has ${available} ${opportunity.unit} remaining.`
          );
        }

        sources.push({
          opportunityId: opportunity.id,
          sellerId: opportunity.sellerId,
          sellerName: opportunity.seller.name,
          materialId: opportunity.materialId,
          quantity: allocation.quantity,
          buyRate: Number(opportunity.askingRate || 0),
          location: opportunity.location || opportunity.seller.city,
        });
      }

      const weightedBuyValue = sources.reduce(
        (sum, source) => sum + source.quantity * source.buyRate,
        0
      );
      const weightedBuyRate = requested > 0 ? weightedBuyValue / requested : 0;
      const sellRate = Number(
        demand.targetRate || sources[0]?.buyRate || 0
      );

      const expectedLandedCost = weightedBuyValue;
      const expectedRevenue = sellRate > 0 ? requested * sellRate : null;
      const expectedProfit =
        expectedRevenue === null ? null : expectedRevenue - expectedLandedCost;
      const expectedMargin =
        expectedRevenue && expectedRevenue > 0 && expectedProfit !== null
          ? (expectedProfit / expectedRevenue) * 100
          : null;

      // The Deal remains the commercial master record.
      // DealSource rows preserve the exact seller/quantity/rate split.
      const master = await tx.deal.create({
        data: {
          companyId: company.id,
          opportunityId: sources[0].opportunityId,
          demandId: demand.id,
          sellerId: sources[0].sellerId,
          buyerId: demand.buyerId,
          materialId: demand.materialId,
          quantity: requested,
          buyRate: weightedBuyRate,
          sellRate: sellRate || null,
          expectedLandedCost,
          expectedProfit,
          expectedMargin,
          procurementType: "Multi-Source / Combined Purchase",
          status:
            requested >= remainingDemand - 0.0001
              ? "Matched"
              : "Partially Matched",
          sellerCommitted: false,
          buyerCommitted: true,
          capitalExposure: true,
          dealSources: {
            create: sources.map(source => ({
              companyId: company.id,
              opportunityId: source.opportunityId,
              sellerId: source.sellerId,
              quantity: source.quantity,
              buyRate: source.buyRate,
              location: source.location,
            })),
          },
        },
        include: {
          seller: true,
          buyer: true,
          material: true,
          demand: true,
          dealSources: { include: { seller: true, opportunity: true } },
        },
      });

      // Reserve supplier-side availability in the central supply register.
      for (const source of sources) {
        const opportunity = await tx.opportunity.findUnique({
          where: { id: source.opportunityId },
        });
        if (!opportunity) throw new Error("Supply source disappeared during allocation.");

        const nextAllocated =
          Number(opportunity.allocatedQuantity || 0) + source.quantity;

        await tx.opportunity.update({
          where: { id: source.opportunityId },
          data: {
            allocatedQuantity: nextAllocated,
            status:
              nextAllocated >= Number(opportunity.quantity) - 0.0001
                ? "Converted"
                : "Partially Allocated",
          },
        });
      }

      const nextMatched = Number(demand.matchedQuantity || 0) + requested;

      await tx.buyerDemand.update({
        where: { id: demand.id },
        data: {
          matchedQuantity: nextMatched,
          status:
            nextMatched >= Number(demand.quantity) - 0.0001
              ? "Matched"
              : "Partially Matched",
        },
      });

      return {
        deal: master,
        sources,
        requested,
        remainingDemand: Math.max(0, remainingDemand - requested),
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the combined deal.",
      },
      { status: 400 }
    );
  }
}

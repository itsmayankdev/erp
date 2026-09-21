import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { code: "STEEL-OS" },
    update: {},
    create: { name: "Steel OS Trading Company", code: "STEEL-OS" }
  });

  const materials = [
    ["MAT-001","E250 Plate","E250","IS 2062"],
    ["MAT-002","HR Coil","IS 2062","Hot Rolled"],
    ["MAT-003","MS Plate","IS 2062","Commercial"],
    ["MAT-004","GI Sheet","DX51D","Galvanized"]
  ];
  const materialMap: Record<string,string> = {};
  for (const [code,name,grade,specification] of materials) {
    const m = await prisma.material.upsert({
      where: { id: code },
      update: { name, grade, specification, active: true },
      create: { id: code, companyId: company.id, code, name, grade, specification, unit: "KG" }
    });
    materialMap[code] = m.id;
  }

  const sellerNames = ["ABC Steel Ltd.","PQR Engineering","Steel Supplier A","Factory Source"];
  const sellerMap: Record<string,string> = {};
  for (const name of sellerNames) {
    const s = await prisma.seller.findFirst({ where: { companyId: company.id, name } });
    const row = s ?? await prisma.seller.create({ data: { companyId: company.id, name, category: "Surplus / Trading", reliability: "Active" } });
    sellerMap[name] = row.id;
  }

  const buyerNames = ["XYZ Industries","LMN Industries","Steel Consumer A","Buyer B"];
  const buyerMap: Record<string,string> = {};
  for (const name of buyerNames) {
    const b = await prisma.buyer.findFirst({ where: { companyId: company.id, name } });
    const row = b ?? await prisma.buyer.create({ data: { companyId: company.id, name, city: "Haryana" } });
    buyerMap[name] = row.id;
  }

  const warehouse = await prisma.warehouse.findFirst({ where: { companyId: company.id, name: "Main Yard" } }) ??
    await prisma.warehouse.create({ data: { companyId: company.id, name: "Main Yard", city: "Rohtak", capacity: 500 } });

  const opportunity = await prisma.opportunity.findFirst({ where: { companyId: company.id, sellerId: sellerMap["ABC Steel Ltd."], materialId: materialMap["MAT-001"] } });
  const op = opportunity ?? await prisma.opportunity.create({
    data: { companyId: company.id, sellerId: sellerMap["ABC Steel Ltd."], materialId: materialMap["MAT-001"], quantity: 20000, unit: "KG", askingRate: 35, estimatedMarketRate: 50, sourceType: "Surplus / Dead Stock", status: "Hot", location: "Haryana" }
  });

  const demand = await prisma.buyerDemand.findFirst({ where: { companyId: company.id, buyerId: buyerMap["XYZ Industries"], materialId: materialMap["MAT-001"] } });
  const dm = demand ?? await prisma.buyerDemand.create({
    data: { companyId: company.id, buyerId: buyerMap["XYZ Industries"], materialId: materialMap["MAT-001"], quantity: 20000, unit: "KG", targetRate: 50, status: "Urgent", location: "Panipat" }
  });

  const deal = await prisma.deal.findFirst({ where: { companyId: company.id, opportunityId: op.id, demandId: dm.id } });
  if (!deal) {
    await prisma.deal.create({
      data: {
        companyId: company.id, opportunityId: op.id, demandId: dm.id,
        sellerId: sellerMap["ABC Steel Ltd."], buyerId: buyerMap["XYZ Industries"], materialId: materialMap["MAT-001"],
        quantity: 20000, buyRate: 35, sellRate: 50, procurementType: "Surplus / Dead Stock",
        status: "Committed", sellerCommitted: true, buyerCommitted: true,
        expectedLandedCost: 700000, expectedProfit: 300000, expectedMargin: 30,
        agreementSeller: true, agreementBuyer: true
      }
    });
  }

  const stock = await prisma.stock.findFirst({ where: { companyId: company.id, dealId: deal?.id ?? "missing" } });
  if (!stock && deal) {
    await prisma.stock.create({ data: { companyId: company.id, materialId: materialMap["MAT-001"], dealId: deal.id, warehouseId: warehouse.id, quantity: 20000, reservedQty: 20000, unitCost: 35, status: "Reserved" } });
  }

  console.log("Seeded Steel OS company:", company.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

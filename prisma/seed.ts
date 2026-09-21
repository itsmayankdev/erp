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

  // Keep the buyer master aligned with the actual Buyers Data module.
  // These two are the initial seeded buyers used for testing.
  const buyerNames = ["XYZ Industries","LMN Industries"];
  const buyerMap: Record<string,string> = {};
  // Remove legacy demo-only buyers and their test transactions.
  // This keeps Market Network, Buyers Data, Smart Material Finder and Deals on the same master data.
  for (const demoBuyer of ["Steel Consumer A", "Buyer B"]) {
    const demo = await prisma.buyer.findFirst({ where: { companyId: company.id, name: demoBuyer } });
    if (demo) {
      const demoSales = await prisma.salesOrder.findMany({ where: { companyId: company.id, buyerId: demo.id }, select: { id: true } });
      const demoDeals = await prisma.deal.findMany({ where: { companyId: company.id, buyerId: demo.id }, select: { id: true } });
      const demoPurchases = await prisma.purchase.findMany({ where: { companyId: company.id, dealId: { in: demoDeals.map(d => d.id) } }, select: { id: true } });
      await prisma.payment.deleteMany({ where: { companyId: company.id, buyerId: demo.id } });
      await prisma.payment.deleteMany({ where: { companyId: company.id, salesOrderId: { in: demoSales.map(s => s.id) } } });
      await prisma.payment.deleteMany({ where: { companyId: company.id, purchaseId: { in: demoPurchases.map(p => p.id) } } });
      await prisma.salesOrder.deleteMany({ where: { companyId: company.id, buyerId: demo.id } });
      await prisma.agreement.deleteMany({ where: { companyId: company.id, dealId: { in: demoDeals.map(d => d.id) } } });
      await prisma.stock.deleteMany({ where: { companyId: company.id, dealId: { in: demoDeals.map(d => d.id) } } });
      await prisma.purchase.deleteMany({ where: { companyId: company.id, dealId: { in: demoDeals.map(d => d.id) } } });
      await prisma.deal.deleteMany({ where: { companyId: company.id, buyerId: demo.id } });
      await prisma.buyerDemand.deleteMany({ where: { companyId: company.id, buyerId: demo.id } });
      await prisma.buyer.delete({ where: { id: demo.id } });
    }
  }
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

  let deal = await prisma.deal.findFirst({ where: { companyId: company.id, opportunityId: op.id, demandId: dm.id } });
  if (!deal) {
    deal = await prisma.deal.create({
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

  // --- Operational test data across the ERP ---
  const hrCoil = materialMap["MAT-002"];
  const msPlate = materialMap["MAT-003"];
  const giSheet = materialMap["MAT-004"];

  const priceRows = [
    { materialId: hrCoil, source: "Steel Market Desk", location: "Delhi NCR", rate: 61, unit: "KG", notes: "Morning market reference" },
    { materialId: msPlate, source: "Buyer Quote", location: "Gurugram", rate: 57, unit: "KG", notes: "Indicative buyer level" },
    { materialId: giSheet, source: "Factory Source", location: "Faridabad", rate: 88, unit: "KG", notes: "Surplus availability check" }
  ];
  for (const p of priceRows) {
    const exists = await prisma.priceIntelligence.findFirst({ where: { companyId: company.id, materialId: p.materialId, source: p.source, location: p.location } });
    if (!exists) await prisma.priceIntelligence.create({ data: { companyId: company.id, ...p } });
  }

  const op2 = await prisma.opportunity.findFirst({ where: { companyId: company.id, sellerId: sellerMap["PQR Engineering"], materialId: hrCoil } });
  if (!op2) await prisma.opportunity.create({
    data: { companyId: company.id, sellerId: sellerMap["PQR Engineering"], materialId: hrCoil, quantity: 40000, unit: "KG", askingRate: 40, estimatedMarketRate: 62, sourceType: "Surplus / Dead Stock", status: "Open", location: "Bawal", notes: "Factory surplus lot available for immediate pickup" }
  });

  const demand2 = await prisma.buyerDemand.findFirst({ where: { companyId: company.id, buyerId: buyerMap["LMN Industries"], materialId: msPlate } });
  if (!demand2) await prisma.buyerDemand.create({
    data: { companyId: company.id, buyerId: buyerMap["LMN Industries"], materialId: msPlate, quantity: 50000, unit: "KG", targetRate: 56, status: "Open", location: "Gurugram", notes: "Monthly requirement" }
  });

  let deal2 = await prisma.deal.findFirst({ where: { companyId: company.id, sellerId: sellerMap["PQR Engineering"], materialId: hrCoil } });
  if (!deal2) {
    deal2 = await prisma.deal.create({
      data: {
        companyId: company.id, sellerId: sellerMap["PQR Engineering"], materialId: hrCoil, buyerId: buyerMap["XYZ Industries"],
        quantity: 40000, buyRate: 40, sellRate: 60, freightCost: 18000, loadingCost: 5000, otherCost: 2000,
        expectedLandedCost: 1625000, expectedProfit: 775000, expectedMargin: 0.4769,
        procurementType: "Surplus / Dead Stock", status: "In Execution", sellerCommitted: true, buyerCommitted: true,
        agreementSeller: true, agreementBuyer: false
      }
    });
  }

  let purchase = await prisma.purchase.findUnique({ where: { reference: "PUR-2026-0001" } });
  if (!purchase) {
    purchase = await prisma.purchase.create({
      data: {
        companyId: company.id, dealId: deal2.id, sellerId: sellerMap["PQR Engineering"], materialId: hrCoil, warehouseId: warehouse.id,
        reference: "PUR-2026-0001", purchaseType: "Surplus / Dead Stock", quantity: 40000, rate: 40,
        freightCost: 18000, loadingCost: 5000, otherCost: 2000, status: "Received", receivedAt: new Date()
      }
    });
  }

  const stock2 = await prisma.stock.findFirst({ where: { companyId: company.id, dealId: deal2.id, materialId: hrCoil } });
  if (!stock2) {
    await prisma.stock.create({
      data: { companyId: company.id, materialId: hrCoil, dealId: deal2.id, warehouseId: warehouse.id, quantity: 40000, reservedQty: 25000, unitCost: 40, status: "Reserved" }
    });
  }

  let sales = await prisma.salesOrder.findUnique({ where: { reference: "SO-2026-0001" } });
  if (!sales) {
    sales = await prisma.salesOrder.create({
      data: {
        companyId: company.id, dealId: deal2.id, buyerId: buyerMap["XYZ Industries"], materialId: hrCoil,
        reference: "SO-2026-0001", quantity: 25000, rate: 60, status: "Confirmed"
      }
    });
  }

  const agreementSeller = await prisma.agreement.findFirst({ where: { companyId: company.id, dealId: deal2.id, side: "Seller" } });
  if (!agreementSeller) await prisma.agreement.create({
    data: { companyId: company.id, dealId: deal2.id, side: "Seller", status: "Signed", version: 1, signedAt: new Date(), termsJson: { payment: "Advance", delivery: "Ex-yard", notes: "Test agreement" } }
  });

  const agreementBuyer = await prisma.agreement.findFirst({ where: { companyId: company.id, dealId: deal2.id, side: "Buyer" } });
  if (!agreementBuyer) await prisma.agreement.create({
    data: { companyId: company.id, dealId: deal2.id, side: "Buyer", status: "Draft", version: 1, termsJson: { payment: "30 days", delivery: "Delivered" } }
  });

  const receivable = await prisma.payment.findUnique({ where: { reference: "REC-2026-0001" } });
  if (!receivable) await prisma.payment.create({
    data: { companyId: company.id, buyerId: buyerMap["XYZ Industries"], salesOrderId: sales?.id, reference: "REC-2026-0001", type: "Receivable", amount: 1500000, dueDate: new Date(Date.now() + 15 * 86400000), status: "Pending", notes: "Test outstanding buyer receivable" }
  });

  const payable = await prisma.payment.findUnique({ where: { reference: "PAY-2026-0001" } });
  if (!payable) await prisma.payment.create({
    data: { companyId: company.id, purchaseId: purchase?.id, reference: "PAY-2026-0001", type: "Payable", amount: 1600000, dueDate: new Date(Date.now() + 7 * 86400000), status: "Pending", notes: "Test supplier payable" }
  });

  const user = await prisma.user.findUnique({ where: { email: "admin@steelos.local" } });
  if (!user) await prisma.user.create({ data: { companyId: company.id, name: "ERP Administrator", email: "admin@steelos.local", role: "Admin" } });

  const document = await prisma.document.findFirst({ where: { companyId: company.id, name: "PQR Engineering Purchase Order" } });
  if (!document) await prisma.document.create({
    data: { companyId: company.id, name: "PQR Engineering Purchase Order", type: "Purchase Order", reference: "PUR-2026-0001", storageKey: "demo/purchase-order.pdf", status: "Verified" }
  });

  const audit = await prisma.auditLog.findFirst({ where: { companyId: company.id, action: "SEED_TEST_DATA" } });
  if (!audit) await prisma.auditLog.create({
    data: { companyId: company.id, action: "SEED_TEST_DATA", entity: "ERP", entityId: company.id, after: { modules: ["opportunities","buyer-demands","deals","agreements","purchase","inventory","sales","payments","documents"] } }
  });

  console.log("Seeded Steel OS company:", company.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

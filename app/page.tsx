import { ArrowUpRight, Bell, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n);

export default async function Home() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });

  if (!company) {
    return (
      <main className="erpPage">
        <header className="topbar">
          <div>
            <p className="eyebrow">STEEL TRADING ERP</p>
            <h1>Database not initialized</h1>
            <p className="muted">Run <code>npm run db:seed</code> after completing the Prisma migration.</p>
          </div>
        </header>
      </main>
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    openDeals,
    opportunities,
    buyerDemands,
    inventory,
    purchases,
    salesOrders,
    purchasePayments,
    salesPayments,
    todayPurchases,
    todaySalesAgg,
    priorityDeals
  ] = await Promise.all([
    prisma.deal.count({ where: { companyId: company.id, status: { notIn: ["Closed", "Completed", "Cancelled"] } } }),
    prisma.opportunity.count({ where: { companyId: company.id, status: { notIn: ["Closed", "Cancelled", "Converted"] } } }),
    prisma.buyerDemand.count({ where: { companyId: company.id, status: { notIn: ["Closed", "Cancelled", "Fulfilled"] } } }),
    prisma.stock.findMany({ where: { companyId: company.id, status: { not: "Sold" } }, select: { quantity: true, unitCost: true } }),
    prisma.purchase.findMany({ where: { companyId: company.id, status: { not: "Cancelled" } }, select: { quantity: true, rate: true, freightCost: true, loadingCost: true, otherCost: true } }),
    prisma.salesOrder.findMany({ where: { companyId: company.id, status: { not: "Cancelled" } }, select: { quantity: true, rate: true } }),
    prisma.payment.aggregate({ where: { companyId: company.id, purchaseId: { not: null }, type: { in: ["Paid", "PAYMENT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { companyId: company.id, salesOrderId: { not: null }, type: { in: ["Received", "RECEIPT"] }, status: { not: "Cancelled" } }, _sum: { amount: true } }),
    prisma.purchase.findMany({ where: { companyId: company.id, createdAt: { gte: startOfDay }, status: { not: "Cancelled" } }, select: { quantity: true, rate: true, freightCost: true, loadingCost: true, otherCost: true } }),
    prisma.salesOrder.findMany({ where: { companyId: company.id, createdAt: { gte: startOfDay }, status: { not: "Cancelled" } }, select: { quantity: true, rate: true } }),
    prisma.deal.findMany({ where: { companyId: company.id, status: { notIn: ["Closed", "Completed", "Cancelled"] } }, include: { seller: true, buyer: true, material: true }, orderBy: { updatedAt: "desc" }, take: 8 })
  ]);

  const inventoryValue = inventory.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost ?? 0), 0);
  const purchaseValue = purchases.reduce((sum, p) => sum + Number(p.quantity) * Number(p.rate) + Number(p.freightCost || 0) + Number(p.loadingCost || 0) + Number(p.otherCost || 0), 0);
  const salesValue = salesOrders.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
  const receivablesValue = Math.max(0, salesValue - Number(salesPayments._sum.amount ?? 0));
  const payablesValue = Math.max(0, purchaseValue - Number(purchasePayments._sum.amount ?? 0));
  const todayPurchase = todayPurchases.reduce((sum, p) => sum + Number(p.quantity)*Number(p.rate) + Number(p.freightCost||0) + Number(p.loadingCost||0) + Number(p.otherCost||0), 0);
  const todaySales = todaySalesAgg.reduce((sum, s) => sum + Number(s.quantity)*Number(s.rate), 0);
  const todayProfit = todaySales - todayPurchase;

  const shortName = (name: string) => {
    const token = (name || "UNMATCHED").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return token.slice(0, 3) || "UNM";
  };
  const pairKey = (d: any) => [d.sellerId, d.buyerId || "UNMATCHED"].join("|");
  const pairCounts = new Map<string, number>();
  const dealSequences = new Map<string, number>();
  [...priorityDeals].reverse().forEach((d: any) => {
    const key = pairKey(d);
    const count = (pairCounts.get(key) || 0) + 1;
    pairCounts.set(key, count);
    dealSequences.set(d.id, count);
  });
  const dealName = (d: any) => {
    const buyer = shortName(d.buyer?.name || "UNMATCHED");
    const seller = shortName(d.seller?.name || "UNKNOWN");
    return `DL-${buyer}_${seller}_${dealSequences.get(d.id) || 1}`;
  };

  return (
    <main className="erpPage">

        <header className="topbar">
          <div>
            <p className="eyebrow">BUSINESS CONTROL CENTER</p>
            <h1>Good morning</h1>
            <p className="muted">{company.name} · Live database view</p>
          </div>
          <div className="topActions">
            <div className="search"><Search size={17} /><span>Search anything...</span><kbd>⌘ K</kbd></div>
            <button className="iconBtn"><Bell size={19} /><i /></button>
            <div className="avatar">MD</div>
          </div>
        </header>

        <div className="hero">
          <div>
            <span className="pill">LIVE OPERATIONS</span>
            <h2>One view of every deal, material & rupee.</h2>
            <p>Track sourcing, commitments, inventory, sales and profitability from the centralized PostgreSQL database.</p>
          </div>
          <Link className="primary" href="/deals?action=new">+ New Deal</Link>
        </div>

        <section className="metrics">
          {[
            ["Open Deals", openDeals, "active deals"],
            ["Opportunities", opportunities, "sourcing leads"],
            ["Buyer Demands", buyerDemands, "requirements"],
            ["Inventory Value", money(inventoryValue), "current value"],
            ["Receivables", money(receivablesValue), "outstanding"],
            ["Payables", money(payablesValue), "to suppliers"]
          ].map(([a, b, c]) => (
            <div className="metric" key={String(a)}>
              <span>{a}</span><strong>{b}</strong><small>{c}</small>
            </div>
          ))}
        </section>

        <div className="grid2">
          <section className="panel">
            <div className="panelHead">
              <div><h3>Today’s trading</h3><p>Calculated from today's purchase and sales records</p></div>
              <Link className="link" href="/reports">View reports <ArrowUpRight size={15} /></Link>
            </div>
            <div className="trading">
              <div><span>Purchase</span><strong>{money(todayPurchase)}</strong><em>Today</em></div>
              <div><span>Sales</span><strong>{money(todaySales)}</strong><em>Today</em></div>
              <div><span>Gross movement</span><strong>{money(todayProfit)}</strong><em>Sales − Purchase</em></div>
            </div>
          </section>

          <section className="panel">
            <div className="panelHead">
              <div><h3>Action center</h3><p>Current database activity</p></div>
            </div>
            <div className="actions">
              <div><span className="badge amber">{openDeals}</span><p><b>Deals in progress</b><small>Review current commitments</small></p><ChevronRight size={17} /></div>
              <div><span className="badge blue">{buyerDemands}</span><p><b>Buyer demands</b><small>Requirements currently tracked</small></p><ChevronRight size={17} /></div>
              <div><span className="badge red">{receivablesValue > 0 ? "!" : "0"}</span><p><b>Receivables</b><small>Outstanding buyer payments</small></p><ChevronRight size={17} /></div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panelHead">
            <div><h3>Priority deals</h3><p>Live records directly from PostgreSQL.</p></div>
            <Link className="link" href="/deals">All deals <ArrowUpRight size={15} /></Link>
          </div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Deal</th><th>Material</th><th>Seller → Buyer</th><th>Purchase</th><th>Sale</th><th>Commitment</th><th>Status</th></tr></thead>
              <tbody>
                {priorityDeals.map(d => (
                  <tr key={d.id}>
                    <td><b>{dealName(d)}</b><small>{d.procurementType}</small></td>
                    <td><b>{d.material.name}</b><small>{d.material.grade ?? "—"} · {Number(d.quantity).toLocaleString("en-IN")} {d.material.unit}</small></td>
                    <td><b>{d.seller.name}</b><small>→ {d.buyer?.name ?? "Buyer not matched"}</small></td>
                    <td>{money(Number(d.buyRate))}/kg</td>
                    <td>{d.sellRate ? money(Number(d.sellRate)) + "/kg" : "—"}</td>
                    <td><span className={"commit " + (d.agreementSeller && d.agreementBuyer ? "ok" : "pending")}>{d.agreementSeller && d.agreementBuyer ? "Fully committed" : d.agreementSeller ? "Seller confirmed" : "Optional"}</span></td>
                    <td><span className={"status " + d.status.toLowerCase().replaceAll(" ", "-")}>{d.status}</span></td>
                  </tr>
                ))}
                {priorityDeals.length === 0 && <tr><td colSpan={7}>No active deals yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <footer><span>ERP Foundation · PostgreSQL source of truth</span><span>© 2026</span></footer>

    </main>
  );
}
import {
  ArrowUpRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Zap
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n);

const nav = [
  ["Overview", LayoutDashboard],
  ["Market Intelligence", PackageSearch],
  ["Opportunities", Zap],
  ["Deals", BriefcaseBusiness],
  ["Agreements", FileCheck2],
  ["Purchase", ShoppingCart],
  ["Inventory", Boxes],
  ["Sales", ReceiptText],
  ["Dispatch", Truck],
  ["Customers & Buyers", Users],
  ["Warehouses", Warehouse]
] as const;

export default async function Home() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });

  if (!company) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h1>Steel Trading ERP</h1>
        <p>Database is connected, but no company has been created yet.</p>
        <p>Run <code>npm run db:seed</code> in Codespaces.</p>
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
    receivables,
    payables,
    todayPurchases,
    todaySalesAgg,
    priorityDeals
  ] = await Promise.all([
    prisma.deal.count({ where: { companyId: company.id, status: { not: "Closed" } } }),
    prisma.opportunity.count({ where: { companyId: company.id, status: { not: "Closed" } } }),
    prisma.buyerDemand.count({ where: { companyId: company.id, status: { not: "Closed" } } }),
    prisma.stock.findMany({
      where: { companyId: company.id },
      select: { quantity: true, unitCost: true }
    }),
    prisma.payment.aggregate({
      where: { companyId: company.id, type: "Receivable", status: { not: "Paid" } },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { companyId: company.id, type: "Payable", status: { not: "Paid" } },
      _sum: { amount: true }
    }),
    prisma.purchase.aggregate({
      where: { companyId: company.id, createdAt: { gte: startOfDay } },
      _sum: { quantity: true, rate: true }
    }),
    prisma.salesOrder.aggregate({
      where: { companyId: company.id, createdAt: { gte: startOfDay } },
      _sum: { quantity: true, rate: true }
    }),
    prisma.deal.findMany({
      where: { companyId: company.id, status: { not: "Closed" } },
      include: { seller: true, buyer: true, material: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitCost ?? 0),
    0
  );
  const todayPurchase = Number(todayPurchases._sum.quantity ?? 0) * Number(todayPurchases._sum.rate ?? 0);
  const todaySales = Number(todaySalesAgg._sum.quantity ?? 0) * Number(todaySalesAgg._sum.rate ?? 0);
  const todayProfit = todaySales - todayPurchase;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">E</div>
          <div><strong>ERP</strong><span>Steel Trading OS</span></div>
        </div>

        <nav>
          {nav.map(([label, Icon], i) => (
            <Link href={label === "Overview" ? "/" : "/" + label.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")} key={label} className={"navItem " + (i === 0 ? "active" : "")}>
              <Icon size={18} />
              <span>{label}</span>
              {label === "Deals" && <b>{openDeals}</b>}
            </Link>
          ))}
        </nav>

        <div className="sideBottom">
          <div className="secure"><span className="dot" />Centralized data</div>
          <small>All business records connect to one source of truth.</small>
        </div>
      </aside>

      <section className="content">
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
            ["Receivables", money(Number(receivables._sum.amount ?? 0)), "outstanding"],
            ["Payables", money(Number(payables._sum.amount ?? 0)), "to suppliers"]
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
              <div><span className="badge red">{Number(receivables._sum.amount ?? 0) > 0 ? "!" : "0"}</span><p><b>Receivables</b><small>Outstanding buyer payments</small></p><ChevronRight size={17} /></div>
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
                    <td><b>{d.id.slice(0, 10)}</b><small>{d.procurementType}</small></td>
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
      </section>
    </main>
  );
}

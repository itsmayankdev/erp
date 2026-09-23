import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

const num = (v: unknown) => Number(v ?? 0);
const money = (v: number) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const qty = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
const date = (v: Date | string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("en-IN") : "—";

function rangeWhere(from?: string, to?: string) {
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(from + "T00:00:00") };
  if (to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(to + "T23:59:59.999") };
  return where;
}

function dealNumberMap(deals: Array<{ id:string; sellerId:string; buyerId:string|null; seller:{name:string}; buyer:{name:string}|null }>) {
  const counts = new Map<string, number>();
  const map = new Map<string, string>();
  const short = (name:string) => {
    const s = (name || "UNM").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return s.slice(0, 3) || "UNM";
  };
  for (const d of [...deals].reverse()) {
    const key = d.sellerId + "|" + (d.buyerId || "UNMATCHED");
    const n = (counts.get(key) || 0) + 1;
    counts.set(key, n);
    map.set(d.id, `DL-${short(d.buyer?.name || "UNMATCHED")}_${short(d.seller?.name || "UNKNOWN")}_${n}`);
  }
  return map;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2><p>Run <code>npm run db:seed</code>.</p></div></main>;
  }

  const where = { companyId: company.id, ...rangeWhere(filters.from, filters.to) };

  const [deals, allDealsForNumbers, purchases, salesOrders, stocks, payments, buyers, sellers, demands] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: { material: true, seller: true, buyer: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.deal.findMany({
      where: { companyId: company.id },
      select: { id:true, sellerId:true, buyerId:true, createdAt:true, seller:{select:{name:true}}, buyer:{select:{name:true}} },
      orderBy: { createdAt: "asc" }
    }),
    prisma.purchase.findMany({
      where,
      include: { seller: true, material: true, payments: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.salesOrder.findMany({
      where,
      include: { buyer: true, material: true, payments: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.stock.findMany({
      where: { companyId: company.id },
      include: { material: true, warehouse: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.payment.findMany({
      where,
      include: { buyer: true, purchase: true, salesOrder: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.buyer.count({ where: { companyId: company.id } }),
    prisma.seller.count({ where: { companyId: company.id } }),
    prisma.buyerDemand.findMany({
      where: { companyId: company.id },
      include: { buyer: true, material: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const allDealIds = deals.map(d => d.id);
  const dealNumbers = dealNumberMap(allDealsForNumbers.map(d => ({
    id:d.id, sellerId:d.sellerId, buyerId:d.buyerId,
    seller:{name:d.seller.name}, buyer:d.buyer ? {name:d.buyer.name} : null
  })));

  const purchaseValue = purchases.reduce((a,p) => a + num(p.quantity) * num(p.rate), 0);
  const salesValue = salesOrders.reduce((a,s) => a + num(s.quantity) * num(s.rate), 0);
  const expectedProfit = deals.reduce((a,d) => a + num(d.expectedProfit), 0);
  const actualProfit = deals.reduce((a,d) => a + (d.actualProfit != null ? num(d.actualProfit) : 0), 0);
  const actualProfitDeals = deals.filter(d => d.actualProfit != null).length;
  const openExposure = deals.filter(d => d.capitalExposure && !["Purchased","Sold","Closed","Cancelled"].includes(d.status))
    .reduce((a,d) => a + num(d.expectedLandedCost ?? (num(d.quantity) * num(d.buyRate))), 0);

  const payableRows = purchases.map(p => {
    const total = num(p.quantity) * num(p.rate) + num(p.freightCost) + num(p.loadingCost) + num(p.otherCost);
    const paid = p.payments.filter(x => x.type !== "Received" && x.type !== "RECEIPT").reduce((a,x) => a + num(x.amount), 0);
    return { id:p.id, reference:p.reference, party:p.seller.name, total, paid, outstanding:Math.max(0,total-paid), status:p.status };
  }).filter(x => x.outstanding > 0);

  const receivableRows = salesOrders.map(s => {
    const total = num(s.quantity) * num(s.rate);
    const received = s.payments.filter(x => x.type === "Received" || x.type === "RECEIPT").reduce((a,x) => a + num(x.amount), 0);
    return { id:s.id, reference:s.reference, party:s.buyer.name, total, received, outstanding:Math.max(0,total-received), status:s.status };
  }).filter(x => x.outstanding > 0);

  const payable = payableRows.reduce((a,x) => a + x.outstanding, 0);
  const receivable = receivableRows.reduce((a,x) => a + x.outstanding, 0);
  const received = payments.filter(p => p.type === "Received" || p.type === "RECEIPT").reduce((a,p) => a + num(p.amount), 0);
  const paid = payments.filter(p => p.type !== "Received" && p.type !== "RECEIPT").reduce((a,p) => a + num(p.amount), 0);
  const stockValue = stocks.reduce((a,s) => a + num(s.quantity) * num(s.unitCost), 0);
  const availableStockQty = stocks.reduce((a,s) => a + Math.max(0,num(s.quantity)-num(s.reservedQty)), 0);
  const reservedStockQty = stocks.reduce((a,s) => a + num(s.reservedQty), 0);

  const materialMap = new Map<string,{name:string; unit:string; qty:number; buy:number; sell:number; profit:number}>();
  for (const d of deals) {
    const k=d.materialId;
    const x=materialMap.get(k)||{name:d.material.name,unit:d.material.unit,qty:0,buy:0,sell:0,profit:0};
    x.qty+=num(d.quantity); x.buy+=num(d.quantity)*num(d.buyRate); x.sell+=num(d.quantity)*num(d.sellRate); x.profit+=d.actualProfit!=null?num(d.actualProfit):num(d.expectedProfit);
    materialMap.set(k,x);
  }
  const materialRows=Array.from(materialMap.values()).sort((a,b)=>b.profit-a.profit).slice(0,8);

  const counterpartyMap = new Map<string,{name:string; role:string; deals:number; value:number; profit:number}>();
  for(const d of deals){
    if(d.seller){
      const k="S|"+d.sellerId; const x=counterpartyMap.get(k)||{name:d.seller.name,role:"Supplier",deals:0,value:0,profit:0};
      x.deals++; x.value+=num(d.quantity)*num(d.buyRate); x.profit+=d.actualProfit!=null?num(d.actualProfit):num(d.expectedProfit); counterpartyMap.set(k,x);
    }
    if(d.buyer){
      const k="B|"+d.buyerId; const x=counterpartyMap.get(k)||{name:d.buyer.name,role:"Buyer",deals:0,value:0,profit:0};
      x.deals++; x.value+=num(d.quantity)*num(d.sellRate); x.profit+=d.actualProfit!=null?num(d.actualProfit):num(d.expectedProfit); counterpartyMap.set(k,x);
    }
  }
  const counterpartyRows=Array.from(counterpartyMap.values()).sort((a,b)=>b.value-a.value).slice(0,10);

  const openDemands=demands.filter(d=>!["Fulfilled","Closed","Cancelled"].includes(d.status));
  const pendingQty=openDemands.reduce((a,d)=>a+Math.max(0,num(d.quantity)-num(d.matchedQuantity)-num(d.fulfilledQuantity)),0);

  const months = new Map<string,{label:string; purchase:number; sales:number; profit:number}>();
  for(const d of deals){
    const dt=new Date(d.createdAt); const key=dt.toISOString().slice(0,7);
    const label=dt.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
    const x=months.get(key)||{label,purchase:0,sales:0,profit:0};
    x.purchase+=num(d.quantity)*num(d.buyRate); x.sales+=num(d.quantity)*num(d.sellRate); x.profit+=d.actualProfit!=null?num(d.actualProfit):num(d.expectedProfit); months.set(key,x);
  }
  const monthly=Array.from(months.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6).map(([,v])=>v);
  const maxMonth=Math.max(1,...monthly.flatMap(x=>[x.purchase,x.sales]));

  const filtersActive=Boolean(filters.from||filters.to);

  return (
    <main className="modulePage reportsPage">
      <header className="moduleHeader">
        <div>
          <p className="eyebrow">MANAGEMENT INTELLIGENCE</p>
          <h1>Reports & Management Intelligence</h1>
          <p className="muted">{company.name} · Commercial, profitability, cash, exposure and operational intelligence.</p>
        </div>
        <div className="moduleActions">
          <Link className="secondaryBtn" href="/">← Dashboard</Link>
        </div>
      </header>

      <section className="reportFilterBar">
        <div><b>REPORT PERIOD</b><span>{filtersActive ? "Filtered view" : "All recorded activity"}</span></div>
        <form>
          <label>From<input type="date" name="from" defaultValue={filters.from||""}/></label>
          <label>To<input type="date" name="to" defaultValue={filters.to||""}/></label>
          <button className="primaryBtn" type="submit">Apply</button>
          {filtersActive && <Link className="secondaryBtn" href="/reports">Clear</Link>}
        </form>
      </section>

      <section className="moduleCards reportKpis managementKpis">
        <div><b>EXPECTED PROFIT</b><strong>{money(expectedProfit)}</strong><span>{deals.length} deals in period</span></div>
        <div><b>ACTUAL PROFIT</b><strong>{money(actualProfit)}</strong><span>{actualProfitDeals} deals with actual profit</span></div>
        <div><b>CAPITAL EXPOSURE</b><strong>{money(openExposure)}</strong><span>Committed capital still exposed</span></div>
        <div><b>RECEIVABLE</b><strong>{money(receivable)}</strong><span>{receivableRows.length} sales balances outstanding</span></div>
        <div><b>PAYABLE</b><strong>{money(payable)}</strong><span>{payableRows.length} purchase balances outstanding</span></div>
        <div><b>STOCK VALUE</b><strong>{money(stockValue)}</strong><span>{qty(availableStockQty)} available · {qty(reservedStockQty)} reserved</span></div>
      </section>

      <div className="managementGrid">
        <section className="modulePanel managementPanel">
          <div className="panelHead"><div><h3>Profitability control</h3><p>Expected vs actual results across current deals.</p></div></div>
          <div className="managementSplit">
            <div><span>Expected</span><strong>{money(expectedProfit)}</strong></div>
            <div><span>Actual recorded</span><strong>{money(actualProfit)}</strong></div>
            <div><span>Not yet actualized</span><strong>{money(Math.max(0,expectedProfit-actualProfit))}</strong></div>
          </div>
          <div className="managementNote">Actual profit is only counted where the Deal has an actual profit value. Other deals remain in expected profit.</div>
        </section>

        <section className="modulePanel managementPanel">
          <div className="panelHead"><div><h3>Working capital</h3><p>Money currently moving through purchases and sales.</p></div></div>
          <div className="managementSplit">
            <div><span>Sales value</span><strong>{money(salesValue)}</strong></div>
            <div><span>Purchase value</span><strong>{money(purchaseValue)}</strong></div>
            <div><span>Net outstanding</span><strong>{money(receivable-payable)}</strong></div>
          </div>
          <div className="managementNote">Receivable and payable are calculated from linked purchase/sales documents and their recorded payments.</div>
        </section>
      </div>

      <div className="managementGrid">
        <section className="modulePanel">
          <div className="panelHead"><div><h3>Recent deal performance</h3><p>Every deal keeps its commercial context and profitability.</p></div><span className="tableCount">{deals.length} deals</span></div>
          <div className="tableWrap">
            <table className="managementTable">
              <thead><tr><th>Date</th><th>Deal</th><th>Material</th><th>Qty</th><th>Buy</th><th>Sell</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>
              <tbody>
                {deals.slice(0,12).map(d=><tr key={d.id}>
                  <td>{date(d.createdAt)}</td>
                  <td><Link className="dealLink" href={"/deals/"+d.id}><b>{dealNumbers.get(d.id)||d.id.slice(0,10)}</b></Link></td>
                  <td><b>{d.material.name}</b><small>{d.buyer?.name||"Buyer pending"}</small></td>
                  <td>{qty(num(d.quantity))} {d.material.unit}</td>
                  <td>{money(num(d.buyRate))}</td>
                  <td>{d.sellRate!=null?money(num(d.sellRate)):"—"}</td>
                  <td>{money(num(d.expectedProfit))}</td>
                  <td className={d.actualProfit!=null?"profitPositive":"muted"}>{d.actualProfit!=null?money(num(d.actualProfit)):"Pending"}</td>
                  <td><span className="status">{d.status}</span></td>
                </tr>)}
                {!deals.length&&<tr><td colSpan={9} className="emptyState">No deals in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="modulePanel">
          <div className="panelHead"><div><h3>Cash collection & payment</h3><p>Outstanding balances that need attention.</p></div></div>
          <div className="attentionList">
            {receivableRows.slice(0,5).map(x=><div key={"r"+x.id}><span><b>To receive</b><small>{x.party} · {x.reference}</small></span><strong>{money(x.outstanding)}</strong></div>)}
            {payableRows.slice(0,5).map(x=><div key={"p"+x.id}><span><b>To pay</b><small>{x.party} · {x.reference}</small></span><strong>{money(x.outstanding)}</strong></div>)}
            {!receivableRows.length&&!payableRows.length&&<div className="managementNote">No linked outstanding balances.</div>}
          </div>
        </section>
      </div>

      <div className="managementGrid">
        <section className="modulePanel">
          <div className="panelHead"><div><h3>Material business</h3><p>Deal quantity, buy value, sell value and profit.</p></div></div>
          <div className="tableWrap"><table className="managementTable"><thead><tr><th>Material</th><th>Qty</th><th>Buy value</th><th>Sell value</th><th>Profit</th></tr></thead><tbody>
            {materialRows.map(x=><tr key={x.name}><td><b>{x.name}</b></td><td>{qty(x.qty)} {x.unit}</td><td>{money(x.buy)}</td><td>{money(x.sell)}</td><td className="profitPositive">{money(x.profit)}</td></tr>)}
            {!materialRows.length&&<tr><td colSpan={5} className="emptyState">No material data in this period.</td></tr>}
          </tbody></table></div>
        </section>

        <section className="modulePanel">
          <div className="panelHead"><div><h3>Counterparty activity</h3><p>Supplier and buyer exposure from executed deals.</p></div></div>
          <div className="tableWrap"><table className="managementTable"><thead><tr><th>Company</th><th>Role</th><th>Deals</th><th>Value</th><th>Profit</th></tr></thead><tbody>
            {counterpartyRows.map(x=><tr key={x.role+x.name}><td><b>{x.name}</b></td><td><span className="tradeRole">{x.role}</span></td><td>{x.deals}</td><td>{money(x.value)}</td><td className="profitPositive">{money(x.profit)}</td></tr>)}
            {!counterpartyRows.length&&<tr><td colSpan={5} className="emptyState">No counterparty data.</td></tr>}
          </tbody></table></div>
        </section>
      </div>

      <div className="managementGrid">
        <section className="modulePanel">
          <div className="panelHead"><div><h3>Trading trend</h3><p>Last six deal months in the selected dataset.</p></div></div>
          <div className="trendChart">
            {monthly.map(x=><div className="trendColumn" key={x.label}>
              <div className="trendBars"><span style={{height:`${Math.max(6,(x.purchase/maxMonth)*100)}%`}} title={`Purchase ${money(x.purchase)}`}></span><span style={{height:`${Math.max(6,(x.sales/maxMonth)*100)}%`}} title={`Sales ${money(x.sales)}`}></span></div>
              <b>{x.label}</b><small>{money(x.profit)}</small>
            </div>)}
            {!monthly.length&&<div className="managementNote">No deal trend data yet.</div>}
          </div>
        </section>

        <section className="modulePanel">
          <div className="panelHead"><div><h3>Management snapshot</h3><p>Current operational indicators.</p></div></div>
          <div className="reportMetricList managementMetrics">
            <div><span>Deals</span><b>{deals.length}</b></div>
            <div><span>Buyers</span><b>{buyers}</b></div>
            <div><span>Suppliers</span><b>{sellers}</b></div>
            <div><span>Open demands</span><b>{openDemands.length}</b></div>
            <div><span>Demand qty pending</span><b>{qty(pendingQty)}</b></div>
            <div><span>Payment records</span><b>{payments.length}</b></div>
          </div>
          <div className="managementLinks">
            <Link href="/deals">View Deals →</Link>
            <Link href="/payments">View Payments →</Link>
            <Link href="/inventory">View Inventory →</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

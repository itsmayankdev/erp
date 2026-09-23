import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecordActions from "@/components/RecordActions";

export const dynamic = "force-dynamic";

const editable = new Set(["deals","opportunities","market-intelligence","customers-and-buyers","warehouses","buyer-demands","sellers","materials"]);

const modules: Record<string, string> = {
  "market-intelligence": "Market Intelligence",
  opportunities: "Opportunities",
  deals: "Deals",
  agreements: "Agreements",
  purchase: "Purchase",
  inventory: "Inventory",
  sales: "Sales",
  dispatch: "Dispatch",
  "customers-and-buyers": "Customers & Buyers",
  warehouses: "Warehouses",
  reports: "Reports"
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const title = modules[module];
  if (!title) notFound();

  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) return <main className="modulePage"><p>No company found. Run <code>npm run db:seed</code>.</p></main>;

  let rows: any[] = [];
  let columns: string[] = [];

  if (module === "deals") {
    rows = await prisma.deal.findMany({ where: { companyId: company.id }, include: { seller: true, buyer: true, material: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Deal", "Material", "Seller", "Buyer", "Qty", "Buy Rate", "Sell Rate", "Status"];
  } else if (module === "opportunities") {
    rows = await prisma.opportunity.findMany({ where: { companyId: company.id }, include: { seller: true, material: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Material", "Seller", "Qty", "Asking", "Market", "Source", "Status"];
  } else if (module === "market-intelligence") {
    rows = await prisma.priceIntelligence.findMany({ where: { companyId: company.id }, include: { material: true }, orderBy: { capturedAt: "desc" } });
    columns = ["Material", "Source", "Location", "Rate", "Unit", "Captured"];
  } else if (module === "inventory") {
    rows = await prisma.stock.findMany({ where: { companyId: company.id }, include: { material: true, warehouse: true }, orderBy: { createdAt: "desc" } });
    columns = ["Material", "Warehouse", "Quantity", "Reserved", "Unit Cost", "Status"];
  } else if (module === "purchase") {
    rows = await prisma.purchase.findMany({ where: { companyId: company.id }, include: { seller: true, material: true }, orderBy: { createdAt: "desc" } });
    columns = ["Reference", "Material", "Seller", "Qty", "Rate", "Type", "Status"];
  } else if (module === "sales" || module === "dispatch") {
    rows = await prisma.salesOrder.findMany({ where: { companyId: company.id }, include: { buyer: true, material: true }, orderBy: { createdAt: "desc" } });
    columns = ["Reference", "Material", "Buyer", "Qty", "Rate", "Status", "Dispatch"];
  } else if (module === "customers-and-buyers") {
    rows = await prisma.buyer.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } });
    columns = ["Company", "City", "Phone", "Email", "Credit Limit"];
  } else if (module === "warehouses") {
    rows = await prisma.warehouse.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } });
    columns = ["Warehouse", "City", "Capacity", "Active"];
  } else if (module === "agreements") {
    rows = await prisma.agreement.findMany({ where: { companyId: company.id }, include: { deal: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Deal", "Side", "Version", "Status", "Valid Until"];
  } else if (module === "buyer-demands") {
    rows = await prisma.buyerDemand.findMany({ where: { companyId: company.id }, include: { buyer: true, material: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Buyer", "Material", "Qty", "Matched", "Fulfilled", "Target Rate", "Required By", "Status"];
  } else if (module === "sellers") {
    rows = await prisma.seller.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } });
    columns = ["Supplier", "Category", "City", "Phone", "Reliability"];
  } else if (module === "materials") {
    rows = await prisma.material.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } });
    columns = ["Code", "Material", "Grade", "Specification", "Unit", "Active"];
  } else if (module === "payments") {
    rows = await prisma.payment.findMany({ where: { companyId: company.id }, include: { buyer: true, purchase: true, salesOrder: true }, orderBy: { createdAt: "desc" } });
    columns = ["Reference", "Type", "Party", "Amount", "Due", "Status"];
  } else if (module === "documents") {
    rows = await prisma.document.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } });
    columns = ["Document", "Type", "Reference", "Status", "Created"];
  } else if (module === "reports") {
    const [deals,purchases,salesOrders,stocks,payments,buyers,sellers] = await Promise.all([
      prisma.deal.findMany({where:{companyId:company.id},include:{material:true,seller:true,buyer:true},orderBy:{createdAt:"desc"}}),
      prisma.purchase.findMany({where:{companyId:company.id},include:{seller:true,material:true},orderBy:{createdAt:"desc"}}),
      prisma.salesOrder.findMany({where:{companyId:company.id},include:{buyer:true,material:true},orderBy:{createdAt:"desc"}}),
      prisma.stock.findMany({where:{companyId:company.id},include:{material:true,warehouse:true}}),
      prisma.payment.findMany({where:{companyId:company.id},orderBy:{createdAt:"desc"}}),
      prisma.buyer.findMany({where:{companyId:company.id}}),
      prisma.seller.findMany({where:{companyId:company.id}})
    ]);
    const num=(v:any)=>Number(v||0);
    const purchaseValue=purchases.reduce((a,p)=>a+num(p.quantity)*num(p.rate),0);
    const salesValue=salesOrders.reduce((a,s)=>a+num(s.quantity)*num(s.rate),0);
    const dealProfit=deals.reduce((a,d)=>a+(d.actualProfit!=null?num(d.actualProfit):d.expectedProfit!=null?num(d.expectedProfit):0),0);
    const stockValue=stocks.reduce((a,s)=>a+num(s.quantity)*num(s.unitCost),0);
    const reservedQty=stocks.reduce((a,s)=>a+num(s.reservedQty),0);
    const received=payments.filter(p=>p.type==="Received" || p.type==="RECEIPT").reduce((a,p)=>a+num(p.amount),0);
    const paid=payments.filter(p=>p.type!=="Received" && p.type!=="RECEIPT").reduce((a,p)=>a+num(p.amount),0);
    const outstandingReceivable=Math.max(0,salesValue-received);
    const outstandingPayable=Math.max(0,purchaseValue-paid);
    const fmt=(v:number)=>"₹"+v.toLocaleString("en-IN",{maximumFractionDigits:0});
    const qtyFmt=(v:number)=>v.toLocaleString("en-IN",{maximumFractionDigits:3});
    const topMaterials=new Map<string,{name:string,qty:number,buy:number,sell:number}>();
    for(const d of deals){const k=d.material.name;const x=topMaterials.get(k)||{name:k,qty:0,buy:0,sell:0};x.qty+=num(d.quantity);x.buy+=num(d.quantity)*num(d.buyRate);x.sell+=num(d.quantity)*num(d.sellRate);topMaterials.set(k,x)}
    const materialRows=Array.from(topMaterials.values()).sort((a,b)=>(b.sell-b.buy)-(a.sell-a.buy)).slice(0,8);
    const topCompanies=new Map<string,{name:string,trades:number,value:number,profit:number}>();
    for(const d of deals){const parties=[d.seller?.name,d.buyer?.name].filter(Boolean) as string[];for(const name of parties){const x=topCompanies.get(name)||{name,trades:0,value:0,profit:0};x.trades++;x.value+=num(d.quantity)*(num(d.buyRate)+num(d.sellRate));x.profit+=d.actualProfit!=null?num(d.actualProfit):num(d.expectedProfit);topCompanies.set(name,x)}}
    const companyRows=Array.from(topCompanies.values()).sort((a,b)=>b.value-a.value).slice(0,8);
    return <main className="modulePage reportsPage">
      <header className="moduleHeader"><div><p className="eyebrow">ERP REPORTING</p><h1>Reports & Analytics</h1><p className="muted">{company.name} · Live commercial, inventory and cash position from PostgreSQL.</p></div><div className="moduleActions"><Link className="secondaryBtn" href="/">← Dashboard</Link></div></header>
      <section className="moduleCards reportKpis">
        <div><b>TRADING PROFIT</b><strong>{fmt(dealProfit)}</strong><span>Actual profit where recorded, otherwise expected profit</span></div>
        <div><b>PURCHASE VALUE</b><strong>{fmt(purchaseValue)}</strong><span>{purchases.length} purchase records</span></div>
        <div><b>SALES VALUE</b><strong>{fmt(salesValue)}</strong><span>{salesOrders.length} sales orders</span></div>
        <div><b>STOCK VALUE</b><strong>{fmt(stockValue)}</strong><span>{stocks.length} stock lots · {qtyFmt(reservedQty)} reserved</span></div>
        <div><b>RECEIVABLE</b><strong>{fmt(outstandingReceivable)}</strong><span>Sales value less recorded receipts</span></div>
        <div><b>PAYABLE</b><strong>{fmt(outstandingPayable)}</strong><span>Purchase value less recorded payments</span></div>
      </section>
      <div className="reportGrid">
        <section className="modulePanel"><div className="panelHead"><div><h3>Material profitability</h3><p>Trading value and spread by material.</p></div></div><div className="tableWrap"><table><thead><tr><th>Material</th><th>Qty</th><th>Buy value</th><th>Sell value</th><th>Spread</th></tr></thead><tbody>{materialRows.map(x=><tr key={x.name}><td><b>{x.name}</b></td><td>{qtyFmt(x.qty)}</td><td>{fmt(x.buy)}</td><td>{fmt(x.sell)}</td><td className="profitPositive">{fmt(x.sell-x.buy)}</td></tr>)}{!materialRows.length&&<tr><td colSpan={5}>No trading data yet.</td></tr>}</tbody></table></div></section>
        <section className="modulePanel"><div className="panelHead"><div><h3>Company-wise business</h3><p>Counterparty activity across executed deals.</p></div></div><div className="tableWrap"><table><thead><tr><th>Company</th><th>Trades</th><th>Business value</th><th>Profit</th></tr></thead><tbody>{companyRows.map(x=><tr key={x.name}><td><b>{x.name}</b></td><td>{x.trades}</td><td>{fmt(x.value)}</td><td className={x.profit>=0?"profitPositive":"profitNegative"}>{fmt(x.profit)}</td></tr>)}{!companyRows.length&&<tr><td colSpan={4}>No trade data yet.</td></tr>}</tbody></table></div></section>
      </div>
      <div className="reportGrid">
        <section className="modulePanel"><div className="panelHead"><div><h3>Operational position</h3><p>Current ERP activity at a glance.</p></div></div><div className="reportMetricList">
          <div><span>Deals</span><b>{deals.length}</b></div><div><span>Buyers</span><b>{buyers.length}</b></div><div><span>Suppliers</span><b>{sellers.length}</b></div><div><span>Purchase records</span><b>{purchases.length}</b></div><div><span>Sales orders</span><b>{salesOrders.length}</b></div><div><span>Payment records</span><b>{payments.length}</b></div>
        </div></section>
        <section className="modulePanel"><div className="panelHead"><div><h3>Cash movement</h3><p>Recorded payment activity; outstanding is derived from transaction values.</p></div></div><div className="reportCash"><div><span>Received</span><strong>{fmt(received)}</strong></div><div><span>Paid</span><strong>{fmt(paid)}</strong></div><div><span>Net recorded cash</span><strong>{fmt(received-paid)}</strong></div></div></section>
      </div>
    </main>;
  } else {
    rows = await prisma.buyerDemand.findMany({ where: { companyId: company.id }, include: { buyer: true, material: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Buyer", "Material", "Qty", "Target Rate", "Required By", "Status"];
  }

  const dealNumbers = new Map<string,string>();
  if (module === "deals" || module === "agreements") {
    const allDeals = await prisma.deal.findMany({ where: { companyId: company.id }, select: { id:true,sellerId:true,buyerId:true,createdAt:true,seller:{select:{name:true}},buyer:{select:{name:true}} }, orderBy:{createdAt:"asc"} });
    const short=(name:string)=>{const s=(name||"UNM").replace(/[^a-zA-Z0-9]/g,"").toUpperCase();return s.slice(0,3)||"UNM"};
    const counts=new Map<string,number>();
    for(const d of allDeals){const key=d.sellerId+"|"+(d.buyerId||"UNMATCHED");const n=(counts.get(key)||0)+1;counts.set(key,n);dealNumbers.set(d.id,`DL-${short(d.buyer?.name||"UNMATCHED")}_${short(d.seller?.name||"UNKNOWN")}_${n}`);}
    if (module === "deals") rows = rows.map((r:any)=>({...r,dealNumber:dealNumbers.get(r.id)||r.id}));
    if (module === "agreements") rows = rows.map((r:any)=>({...r,dealNumber:dealNumbers.get(r.dealId)||r.deal?.id||"—"}));
  }

  const clientRows = JSON.parse(JSON.stringify(rows));

  return (
    <main className="modulePage">
      <header className="moduleHeader">
        <div><p className="eyebrow">ERP MODULE</p><h1>{title}</h1><p className="muted">{company.name} · {rows.length} records</p></div>
        <div className="moduleActions"><Link className="secondaryBtn" href="/">← Dashboard</Link>{editable.has(module) && <RecordActions module={module} />}</div>
      </header>
      <section className="modulePanel">
        <div className="panelHead"><div><h3>{title} records</h3><p>Live data from PostgreSQL</p></div></div>
        <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
          {clientRows.map((r:any)=><tr key={r.id}>
            {module==="deals" && <><td><Link className="dealLink" href={"/deals/"+r.id}><b>{r.dealNumber||r.id.slice(0,10)}</b><small>{r.procurementType}</small></Link></td><td>{r.material.name}</td><td>{r.seller.name}</td><td>{r.buyer?.name ?? "—"}</td><td>{Number(r.quantity).toLocaleString("en-IN")} {r.material.unit}</td><td>₹{Number(r.buyRate).toLocaleString("en-IN")}</td><td>{r.sellRate ? "₹"+Number(r.sellRate).toLocaleString("en-IN") : "—"}</td><td><span className="status">{r.status}</span></td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="opportunities" && <><td>{r.material.name}</td><td>{r.seller.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")} {r.unit}</td><td>{r.askingRate ? "₹"+Number(r.askingRate) : "—"}</td><td>{r.estimatedMarketRate ? "₹"+Number(r.estimatedMarketRate) : "—"}</td><td>{r.sourceType}</td><td><span className="status">{r.status}</span></td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="market-intelligence" && <><td>{r.material.name}</td><td>{r.source ?? "—"}</td><td>{r.location ?? "—"}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td>{r.unit}</td><td>{new Date(r.capturedAt).toLocaleDateString("en-IN")}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="inventory" && <><td>{r.material.name}</td><td>{r.warehouse?.name ?? "Unassigned"}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>{Number(r.reservedQty).toLocaleString("en-IN")}</td><td>{r.unitCost ? "₹"+Number(r.unitCost) : "—"}</td><td><span className="status">{r.status}</span></td></>}
            {module==="purchase" && <><td>{r.reference}</td><td>{r.material.name}</td><td>{r.seller.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td>{r.purchaseType}</td><td><span className="status">{r.status}</span></td></>}
            {(module==="sales" || module==="dispatch") && <><td>{r.reference}</td><td>{r.material.name}</td><td>{r.buyer.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td><span className="status">{r.status}</span></td><td>{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString("en-IN") : "Pending"}</td></>}
            {module==="customers-and-buyers" && <><td>{r.name}</td><td>{r.city ?? "—"}</td><td>{r.phone ?? "—"}</td><td>{r.email ?? "—"}</td><td>{r.creditLimit ? "₹"+Number(r.creditLimit).toLocaleString("en-IN") : "—"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="warehouses" && <><td>{r.name}</td><td>{r.city ?? "—"}</td><td>{r.capacity ? Number(r.capacity).toLocaleString("en-IN") : "—"}</td><td>{r.active ? "Active" : "Inactive"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="agreements" && <><td>{r.dealNumber||r.deal.id.slice(0,10)}</td><td>{r.side}</td><td>v{r.version}</td><td><span className="status">{r.status}</span></td><td>{r.validUntil ? new Date(r.validUntil).toLocaleDateString("en-IN") : "—"}</td></>}
            {module==="buyer-demands" && <><td>{r.buyer.name}</td><td>{r.material.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")} {r.unit}</td><td>{Number(r.matchedQuantity ?? 0).toLocaleString("en-IN")} {r.unit}</td><td>{Number(r.fulfilledQuantity ?? 0).toLocaleString("en-IN")} {r.unit}</td><td>{r.targetRate ? "₹"+Number(r.targetRate) : "—"}</td><td>{r.requiredBy ? new Date(r.requiredBy).toLocaleDateString("en-IN") : "—"}</td><td><span className="status">{r.status}</span></td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="sellers" && <><td>{r.name}</td><td>{r.category ?? "—"}</td><td>{r.city ?? "—"}</td><td>{r.phone ?? "—"}</td><td>{r.reliability ?? "—"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="materials" && <><td>{r.code ?? "—"}</td><td>{r.name}</td><td>{r.grade ?? "—"}</td><td>{r.specification ?? "—"}</td><td>{r.unit}</td><td>{r.active ? "Active" : "Inactive"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="payments" && <><td>{r.reference}</td><td>{r.type}</td><td>{r.buyer?.name ?? r.purchase?.sellerId ?? "—"}</td><td>₹{Number(r.amount).toLocaleString("en-IN")}</td><td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-IN") : "—"}</td><td><span className="status">{r.status}</span></td></>}
            {module==="documents" && <><td>{r.name}</td><td>{r.type}</td><td>{r.reference ?? "—"}</td><td><span className="status">{r.status}</span></td><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td></>}

          </tr>)}
          {rows.length===0 && <tr><td colSpan={columns.length}>No records yet.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}

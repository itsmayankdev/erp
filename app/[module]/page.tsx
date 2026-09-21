import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecordActions from "@/components/RecordActions";

export const dynamic = "force-dynamic";

const editable = new Set(["deals","opportunities","market-intelligence","customers-and-buyers","warehouses"]);

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
  } else if (module === "reports") {
    return <main className="modulePage"><header className="moduleHeader"><div><p className="eyebrow">ERP REPORTS</p><h1>Reports</h1><p className="muted">Operational reporting is connected to the same PostgreSQL records.</p></div><Link className="secondaryBtn" href="/">Dashboard</Link></header><section className="moduleCards"><div><b>Deals</b><strong>{await prisma.deal.count({where:{companyId:company.id}})}</strong><span>Total deal records</span></div><div><b>Inventory</b><strong>{await prisma.stock.count({where:{companyId:company.id}})}</strong><span>Stock records</span></div><div><b>Sales</b><strong>{await prisma.salesOrder.count({where:{companyId:company.id}})}</strong><span>Sales orders</span></div></section></main>;
  } else {
    rows = await prisma.buyerDemand.findMany({ where: { companyId: company.id }, include: { buyer: true, material: true }, orderBy: { updatedAt: "desc" } });
    columns = ["Buyer", "Material", "Qty", "Target Rate", "Required By", "Status"];
  }

  return (
    <main className="modulePage">
      <header className="moduleHeader">
        <div><p className="eyebrow">ERP MODULE</p><h1>{title}</h1><p className="muted">{company.name} · {rows.length} records</p></div>
        <div className="moduleActions"><Link className="secondaryBtn" href="/">← Dashboard</Link>{editable.has(module) && <RecordActions module={module} />}</div>
      </header>
      <section className="modulePanel">
        <div className="panelHead"><div><h3>{title} records</h3><p>Live data from PostgreSQL</p></div></div>
        <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
          {rows.map((r:any)=><tr key={r.id}>
            {module==="deals" && <><td><b>{r.id.slice(0,10)}</b><small>{r.procurementType}</small></td><td>{r.material.name}</td><td>{r.seller.name}</td><td>{r.buyer?.name ?? "—"}</td><td>{Number(r.quantity).toLocaleString("en-IN")} {r.material.unit}</td><td>₹{Number(r.buyRate).toLocaleString("en-IN")}</td><td>{r.sellRate ? "₹"+Number(r.sellRate).toLocaleString("en-IN") : "—"}</td><td><span className="status">{r.status}</span></td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="opportunities" && <><td>{r.material.name}</td><td>{r.seller.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")} {r.unit}</td><td>{r.askingRate ? "₹"+Number(r.askingRate) : "—"}</td><td>{r.estimatedMarketRate ? "₹"+Number(r.estimatedMarketRate) : "—"}</td><td>{r.sourceType}</td><td><span className="status">{r.status}</span></td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="market-intelligence" && <><td>{r.material.name}</td><td>{r.source ?? "—"}</td><td>{r.location ?? "—"}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td>{r.unit}</td><td>{new Date(r.capturedAt).toLocaleDateString("en-IN")}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="inventory" && <><td>{r.material.name}</td><td>{r.warehouse?.name ?? "Unassigned"}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>{Number(r.reservedQty).toLocaleString("en-IN")}</td><td>{r.unitCost ? "₹"+Number(r.unitCost) : "—"}</td><td><span className="status">{r.status}</span></td></>}
            {module==="purchase" && <><td>{r.reference}</td><td>{r.material.name}</td><td>{r.seller.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td>{r.purchaseType}</td><td><span className="status">{r.status}</span></td></>}
            {(module==="sales" || module==="dispatch") && <><td>{r.reference}</td><td>{r.material.name}</td><td>{r.buyer.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>₹{Number(r.rate).toLocaleString("en-IN")}</td><td><span className="status">{r.status}</span></td><td>{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString("en-IN") : "Pending"}</td></>}
            {module==="customers-and-buyers" && <><td>{r.name}</td><td>{r.city ?? "—"}</td><td>{r.phone ?? "—"}</td><td>{r.email ?? "—"}</td><td>{r.creditLimit ? "₹"+Number(r.creditLimit).toLocaleString("en-IN") : "—"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="warehouses" && <><td>{r.name}</td><td>{r.city ?? "—"}</td><td>{r.capacity ? Number(r.capacity).toLocaleString("en-IN") : "—"}</td><td>{r.active ? "Active" : "Inactive"}</td><td><RecordActions module={module} row={r} mode="edit"/></td></>}
            {module==="agreements" && <><td>{r.deal.id.slice(0,10)}</td><td>{r.side}</td><td>v{r.version}</td><td><span className="status">{r.status}</span></td><td>{r.validUntil ? new Date(r.validUntil).toLocaleDateString("en-IN") : "—"}</td></>}
            {module==="buyer-demands" && <><td>{r.buyer.name}</td><td>{r.material.name}</td><td>{Number(r.quantity).toLocaleString("en-IN")}</td><td>{r.targetRate ? "₹"+Number(r.targetRate) : "—"}</td><td>{r.requiredBy ? new Date(r.requiredBy).toLocaleDateString("en-IN") : "—"}</td><td><span className="status">{r.status}</span></td></>}
          </tr>)}
          {rows.length===0 && <tr><td colSpan={columns.length}>No records yet.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}

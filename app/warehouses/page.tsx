import { prisma } from "@/lib/prisma";

export default async function WarehousesPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;
  const rows=await prisma.warehouse.findMany({where:{companyId:company.id},include:{stocks:true},orderBy:{createdAt:"asc"}});
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">MASTER DATA</p><h1>Warehouses</h1><p className="muted">Central warehouse master connected to inventory movements and dispatch.</p></div></header>
    <section className="moduleCards">
      <div><b>LOCATIONS</b><strong>{rows.length}</strong><span>Registered storage locations</span></div>
      <div><b>STOCK LOTS</b><strong>{rows.reduce((a:any,w:any)=>a+w.stocks.length,0)}</strong><span>Inventory records across locations</span></div>
      <div><b>ACTIVE</b><strong>{rows.length}</strong><span>Available warehouse locations</span></div>
    </section>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Warehouse register</h3><p>Each location is available for inventory, receiving and dispatch workflows.</p></div><span className="tableCount">{rows.length} locations</span></div>
      <div className="tableWrap"><table><thead><tr><th>Warehouse</th><th>Location</th><th>Stock Lots</th><th>Status</th><th>Usage</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><b>{r.name}</b><small>{r.code||r.id.slice(0,8)}</small></td><td>{r.location||"—"}</td><td>{r.stocks.length}</td><td><span className="statusPill status-active">Active</span></td><td>Inventory & dispatch</td></tr>)}{!rows.length&&<tr><td colSpan={5} className="emptyState">No warehouses configured yet.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
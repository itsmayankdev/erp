import { prisma } from "@/lib/prisma";

export default async function MaterialsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;
  const rows=await prisma.material.findMany({where:{companyId:company.id},include:{_count:{select:{stocks:true,opportunities:true,demands:true,deals:true}}},orderBy:{createdAt:"asc"}});
  const active=rows.filter((r:any)=>r.active).length;
  const stockLots=rows.reduce((a:any,r:any)=>a+r._count.stocks,0);
  const opportunities=rows.reduce((a:any,r:any)=>a+r._count.opportunities,0);
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">MASTER DATA</p><h1>Material Master</h1><p className="muted">Standardized material identity keeps market intelligence, deals, inventory and demand connected.</p></div></header>
    <section className="moduleCards">
      <div><b>MATERIALS</b><strong>{rows.length}</strong><span>Registered material identities</span></div>
      <div><b>ACTIVE</b><strong>{active}</strong><span>Materials available for trading</span></div>
      <div><b>STOCK LOTS</b><strong>{stockLots}</strong><span>Inventory lots using these materials</span></div>
      <div><b>SUPPLY OPPORTUNITIES</b><strong>{opportunities}</strong><span>Open supply records</span></div>
    </section>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Material register</h3><p>Codes, grades, specifications and usage across the ERP.</p></div><span className="tableCount">{rows.length} materials</span></div>
      <div className="tableWrap"><table><thead><tr><th>Material</th><th>Code</th><th>Grade</th><th>Specification</th><th>Unit</th><th>Stock Lots</th><th>Supply</th><th>Demand</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r:any)=><tr key={r.id}>
        <td><b>{r.name}</b><small>{r.id.slice(0,10)}</small></td>
        <td>{r.code||"—"}</td><td>{r.grade||"—"}</td><td>{r.specification||"—"}</td><td>{r.unit}</td>
        <td>{r._count.stocks}</td><td>{r._count.opportunities}</td><td>{r._count.demands}</td>
        <td><span className={"statusPill "+(r.active?"status-active":"status-cancelled")}>{r.active?"Active":"Inactive"}</span></td>
      </tr>)}{!rows.length&&<tr><td colSpan={9} className="emptyState">No materials registered yet.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
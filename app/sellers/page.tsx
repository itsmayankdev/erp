import { prisma } from "@/lib/prisma";

export default async function SellersPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;
  const rows=await prisma.seller.findMany({where:{companyId:company.id},include:{_count:{select:{deals:true,opportunities:true,purchases:true}}},orderBy:{createdAt:"asc"}});
  const active=rows.length;
  const opportunities=rows.reduce((a:any,r:any)=>a+r._count.opportunities,0);
  const trades=rows.reduce((a:any,r:any)=>a+r._count.deals,0);
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">MASTER DATA</p><h1>Sellers &amp; Suppliers</h1><p className="muted">Central source master for factories, surplus sellers and corporate suppliers.</p></div></header>
    <section className="moduleCards">
      <div><b>SUPPLIERS</b><strong>{rows.length}</strong><span>Registered seller accounts</span></div>
      <div><b>ACTIVE SOURCES</b><strong>{active}</strong><span>Available supplier relationships</span></div>
      <div><b>OPEN OPPORTUNITIES</b><strong>{opportunities}</strong><span>Supply opportunities linked</span></div>
      <div><b>TRADE HISTORY</b><strong>{trades}</strong><span>Deals linked to suppliers</span></div>
    </section>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Supplier register</h3><p>Contact, location, source type and commercial activity in one place.</p></div><span className="tableCount">{rows.length} suppliers</span></div>
      <div className="tableWrap"><table><thead><tr><th>Supplier</th><th>Category</th><th>Contact</th><th>Location</th><th>Opportunities</th><th>Deals</th><th>Purchases</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r:any)=><tr key={r.id}>
        <td><b>{r.name}</b><small>{r.id.slice(0,10)}</small></td>
        <td>{r.category||"Supplier"}</td>
        <td>{r.phone||r.email||"—"}</td>
        <td>{r.city||"—"}</td>
        <td>{r._count.opportunities}</td><td>{r._count.deals}</td><td>{r._count.purchases}</td>
        <td><span className="statusPill status-active">Active</span></td>
      </tr>)}{!rows.length&&<tr><td colSpan={8} className="emptyState">No sellers or suppliers registered yet.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
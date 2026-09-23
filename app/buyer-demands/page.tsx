import { prisma } from "@/lib/prisma";

export default async function BuyerDemandsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;
  const rows=await prisma.buyerDemand.findMany({where:{companyId:company.id},include:{buyer:true,material:true},orderBy:{createdAt:"desc"}});
  const active=rows.filter(x=>!["Converted","Closed","Cancelled","Fulfilled"].includes(x.status)).length;
  const urgent=rows.filter(x=>String(x.status).toLowerCase().includes("urgent")).length;
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">BUYER INTELLIGENCE</p><h1>Buyer Demands</h1><p className="muted">Customer requirements connected directly to matching, deals and sales.</p></div></header>
    <section className="moduleCards">
      <div><b>ACTIVE DEMANDS</b><strong>{active}</strong><span>Open customer requirements</span></div>
      <div><b>TOTAL RECORDS</b><strong>{rows.length}</strong><span>All recorded requirements</span></div>
      <div><b>URGENT</b><strong>{urgent}</strong><span>Requirements requiring attention</span></div>
    </section>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Buyer requirement register</h3><p>Every requirement keeps quantity, target rate, location and matching status.</p></div><span className="tableCount">{rows.length} records</span></div>
      <div className="tableWrap"><table><thead><tr><th>Requirement</th><th>Buyer</th><th>Material</th><th>Required Qty</th><th>Matched</th><th>Target Rate</th><th>Required By</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r:any)=><tr key={r.id}>
        <td><b>{r.id.slice(0,10)}</b><small>{r.location||"Location not specified"}</small></td>
        <td>{r.buyer?.name||"Buyer TBD"}</td><td><b>{r.material?.name||"—"}</b><small>{r.material?.code||""}</small></td>
        <td>{Number(r.quantity).toLocaleString("en-IN")} {r.unit||"KG"}</td>
        <td>{Number(r.matchedQuantity||0).toLocaleString("en-IN")} {r.unit||"KG"}</td>
        <td>{r.targetRate!=null?"₹"+Number(r.targetRate).toLocaleString("en-IN"):"—"}</td>
        <td>{r.requiredBy?new Date(r.requiredBy).toLocaleDateString("en-IN"):"—"}</td>
        <td><span className={"statusPill status-"+String(r.status||"Open").toLowerCase().replace(/\s+/g,"-")}>{r.status||"Open"}</span></td>
      </tr>)}{!rows.length&&<tr><td colSpan={8} className="emptyState">No buyer demands recorded yet.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
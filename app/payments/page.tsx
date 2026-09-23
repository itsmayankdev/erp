import { prisma } from "@/lib/prisma";

export default async function PaymentsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;
  const rows=await prisma.payment.findMany({where:{companyId:company.id},include:{buyer:true,purchase:{include:{seller:true}},salesOrder:{include:{buyer:true}}},orderBy:{createdAt:"desc"}});
  const total=rows.reduce((a:any,r:any)=>a+Number(r.amount||0),0);
  const received=rows.filter((r:any)=>["Received","RECEIPT","Receipt"].includes(r.type)).reduce((a:any,r:any)=>a+Number(r.amount||0),0);
  const paid=total-received;
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">FINANCE</p><h1>Payments</h1><p className="muted">Central payment register linked to purchases, sales and counterparties.</p></div></header>
    <section className="moduleCards">
      <div><b>PAYMENT RECORDS</b><strong>{rows.length}</strong><span>Recorded transactions</span></div>
      <div><b>RECEIVED</b><strong>₹{received.toLocaleString("en-IN")}</strong><span>Customer receipts</span></div>
      <div><b>PAID</b><strong>₹{paid.toLocaleString("en-IN")}</strong><span>Supplier and other payments</span></div>
    </section>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Payment register</h3><p>Trace every payment back to its commercial document.</p></div><span className="tableCount">{rows.length} records</span></div>
      <div className="tableWrap"><table><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Counterparty</th><th>Linked document</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r:any)=>{
        const counterparty=r.buyer?.name||r.purchase?.seller?.name||r.salesOrder?.buyer?.name||"—";
        const linked=r.purchase?.reference||r.salesOrder?.reference||"Unlinked";
        return <tr key={r.id}><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td><td><b>{r.reference}</b></td><td>{r.type}</td><td>{counterparty}</td><td>{linked}</td><td><b>₹{Number(r.amount).toLocaleString("en-IN")}</b></td><td>{r.dueDate?new Date(r.dueDate).toLocaleDateString("en-IN"):"—"}</td><td><span className={"statusPill status-"+String(r.status||"Pending").toLowerCase().replace(/\s+/g,"-")}>{r.status||"Pending"}</span></td></tr>
      })}{!rows.length&&<tr><td colSpan={8} className="emptyState">No payment records yet.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
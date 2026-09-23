import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Buyers() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) return <main className="modulePage"><p>No company found.</p></main>;

  const rows = await prisma.buyer.findMany({
    where: { companyId: company.id },
    include: { demands: true },
    orderBy: { name: "asc" }
  });

  return <main className="modulePage">
    <header className="moduleHeader">
      <div><p className="eyebrow">MASTER DATA</p><h1>Customers & Buyers</h1><p className="muted">{company.name} · Central buyer master linked directly to demands, deals and sales.</p></div>
    </header>
    <section className="modulePanel">
      <div className="panelHead"><div><h3>Buyer master</h3><p>Every buyer shown here is a real record from the centralized PostgreSQL database.</p></div><span className="tableCount">{rows.length} buyers</span></div>
      <div className="tableWrap"><table><thead><tr><th>Buyer</th><th>Location</th><th>Requirements</th><th>Status</th></tr></thead>
      <tbody>{rows.map(b => {
        const active = b.demands.filter(d => !["Closed","Cancelled","Fulfilled","Matched"].includes(d.status) && Number(d.quantity) - Number(d.matchedQuantity || 0) > 0.0001).length;
        return <tr key={b.id}><td><b>{b.name}</b><small>{b.phone || b.email || "No contact recorded"}</small></td><td>{b.city || "—"}</td><td>{active}</td><td><span className="statusPill">{active > 0 ? "Active" : "No open requirement"}</span></td></tr>;
      })}{!rows.length && <tr><td colSpan={4} className="emptyState">No buyers recorded.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}

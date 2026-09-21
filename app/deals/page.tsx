import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic="force-dynamic";

export default async function DealsPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;
 const deals=await prisma.deal.findMany({where:{companyId:company.id},include:{seller:true,buyer:true,material:true},orderBy:{updatedAt:"desc"}});
 const safe=(n:any)=>Number(n||0);
 return <main className="modulePage">
  <header className="moduleHeader">
   <div><p className="eyebrow">COMMERCIAL CONTROL</p><h1>Deals</h1><p className="muted">{company.name} · {deals.length} deal records · every deal connects seller, buyer, material, purchase, stock, sale and profitability.</p></div>
   <div className="moduleActions"><Link className="secondaryBtn" href="/smart-finder">Find Supply</Link><Link className="saveBtn" href="/deals/new">+ New Deal</Link></div>
  </header>
  <section className="moduleCards dealKpis">
   <div><b>OPEN</b><strong>{deals.filter(d=>!["Closed","Cancelled"].includes(d.status)).length}</strong><span>Active commercial records</span></div>
   <div><b>EXPOSURE</b><strong>{deals.filter(d=>d.capitalExposure).length}</strong><span>Seller committed / buyer pending</span></div>
   <div><b>EXPECTED PROFIT</b><strong>₹{deals.reduce((n,d)=>n+safe(d.expectedProfit),0).toLocaleString("en-IN",{maximumFractionDigits:0})}</strong><span>Across current deals</span></div>
  </section>
  <section className="modulePanel">
   <div className="panelHead"><div><h3>Deal register</h3><p>Open a deal to enter its complete workspace.</p></div></div>
   <div className="tableWrap"><table><thead><tr><th>Deal</th><th>Material</th><th>Seller</th><th>Buyer</th><th>Qty</th><th>Buy</th><th>Sell</th><th>Expected Profit</th><th>Status</th></tr></thead><tbody>
    {deals.map(d=><tr key={d.id}><td><Link className="dealLink" href={"/deals/"+d.id}><b>{d.id.slice(0,10)}</b><small>{d.procurementType}</small></Link></td><td><b>{d.material.name}</b><small>{d.material.grade||d.material.specification||""}</small></td><td>{d.seller.name}</td><td>{d.buyer?.name||"Unmatched"}</td><td>{safe(d.quantity).toLocaleString("en-IN")} {d.material.unit}</td><td>₹{safe(d.buyRate).toLocaleString("en-IN")}</td><td>{d.sellRate?"₹"+safe(d.sellRate).toLocaleString("en-IN"):"—"}</td><td>₹{safe(d.expectedProfit).toLocaleString("en-IN",{maximumFractionDigits:0})}</td><td><span className="status">{d.status}</span></td></tr>)}
    {!deals.length&&<tr><td colSpan={9} className="emptyRegister">No deals yet. Use Smart Material Finder to convert a matched supply + buyer requirement into a deal.</td></tr>}
   </tbody></table></div>
  </section>
 </main>;
}
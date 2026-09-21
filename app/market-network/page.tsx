import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic="force-dynamic";

export default async function MarketNetwork(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;
 const [sellers,buyers,supply,demand]=await Promise.all([
  prisma.seller.findMany({where:{companyId:company.id},include:{opportunities:{include:{material:true},orderBy:{updatedAt:"desc"},take:3}},orderBy:{name:"asc"}}),
  prisma.buyer.findMany({where:{companyId:company.id},include:{demands:{include:{material:true},orderBy:{updatedAt:"desc"},take:3}},orderBy:{name:"asc"}}),
  prisma.opportunity.findMany({where:{companyId:company.id,status:{notIn:["Closed","Cancelled","Converted"]}},include:{seller:true,material:true},orderBy:{updatedAt:"desc"},take:8}),
  prisma.buyerDemand.findMany({where:{companyId:company.id,status:{notIn:["Closed","Cancelled","Matched"]}},include:{buyer:true,material:true},orderBy:{updatedAt:"desc"},take:8})
 ]);
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">TRADING NETWORK</p><h1>Market Network</h1><p className="muted">Your internal knowledge base of buyers, sellers, materials, availability and active requirements.</p></div><div className="moduleActions"><Link className="secondaryBtn" href="/smart-finder">Open Smart Material Finder</Link></div></header>
  <section className="networkStats"><div><span>SELLERS</span><b>{sellers.length}</b><small>Known supply sources</small></div><div><span>BUYERS</span><b>{buyers.length}</b><small>Known customers</small></div><div><span>ACTIVE SUPPLY</span><b>{supply.length}</b><small>Open supply signals</small></div><div><span>ACTIVE DEMAND</span><b>{demand.length}</b><small>Open requirements</small></div></section>
  <div className="networkGrid">
   <section className="modulePanel"><div className="panelHead"><div><h3>Supplier network</h3><p>What each source is known to have</p></div></div><div className="networkList">{sellers.map(s=><div className="networkRow" key={s.id}><div><b>{s.name}</b><small>{s.city||"Location not recorded"} · {s.reliability||"Reliability not rated"}</small></div><div>{s.opportunities.map(o=><span className="networkChip" key={o.id}>{o.material.name} · {Number(o.quantity).toLocaleString("en-IN")} {o.unit}{o.askingRate?" · ₹"+Number(o.askingRate):""}</span>)}</div></div>)}</div></section>
   <section className="modulePanel"><div className="panelHead"><div><h3>Buyer network</h3><p>What each buyer is currently looking for</p></div></div><div className="networkList">{buyers.map(b=><div className="networkRow" key={b.id}><div><b>{b.name}</b><small>{b.city||"Location not recorded"}</small></div><div>{b.demands.map(d=><span className="networkChip demandChip" key={d.id}>{d.material.name} · {Number(d.quantity).toLocaleString("en-IN")} {d.unit}{d.targetRate?" · target ₹"+Number(d.targetRate):""}</span>)}</div></div>)}</div></section>
  </div>
  <section className="networkGrid"><section className="modulePanel"><div className="panelHead"><div><h3>Active supply signals</h3><p>These are the records Smart Material Finder searches.</p></div></div><div className="networkTable">{supply.map(o=><div key={o.id}><b>{o.material.name}</b><span>{o.seller.name}</span><span>{Number(o.quantity).toLocaleString("en-IN")} {o.unit}</span><strong>{o.askingRate?"₹"+Number(o.askingRate):"Price not recorded"}</strong></div>)}</div></section><section className="modulePanel"><div className="panelHead"><div><h3>Active buyer requirements</h3><p>Demand records available for matching.</p></div></div><div className="networkTable">{demand.map(d=><div key={d.id}><b>{d.material.name}</b><span>{d.buyer.name}</span><span>{Number(d.quantity).toLocaleString("en-IN")} {d.unit}</span><strong>{d.targetRate?"₹"+Number(d.targetRate):"Target not recorded"}</strong></div>)}</div></section></section>
 </main>
}
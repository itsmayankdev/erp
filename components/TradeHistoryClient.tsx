"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const n=(v:any)=>Number(v||0);
const money=(v:any)=>"₹"+n(v).toLocaleString("en-IN",{maximumFractionDigits:0});
const qty=(v:any,u="KG")=>n(v).toLocaleString("en-IN",{maximumFractionDigits:3})+" "+u;

export default function TradeHistoryClient({counterparties,deals}:any){
 const [companyId,setCompanyId]=useState("");
 const [role,setRole]=useState("all");
 const [q,setQ]=useState("");
 const [status,setStatus]=useState("");
 const selected=counterparties.find((x:any)=>x.id===companyId);
 const filtered=useMemo(()=>deals.filter((d:any)=>{
   if(companyId && d.counterpartyId!==companyId)return false;
   if(role!=="all"&&d.role!==role)return false;
   if(status&&d.status!==status)return false;
   if(q){const s=[d.id,d.material?.name,d.material?.grade,d.material?.specification,d.buyer?.name,d.seller?.name,d.status,d.procurementType].join(" ").toLowerCase();if(!s.includes(q.toLowerCase()))return false;}
   return true;
 }),[deals,companyId,role,status,q]);
 const stats=useMemo(()=>filtered.reduce((a:any,d:any)=>{
   a.trades++;a.qty+=n(d.quantity);a.purchaseValue+=n(d.purchaseValue);a.salesValue+=n(d.salesValue);a.profit+=n(d.profit);a.freight+=n(d.freight);a.paid+=n(d.paid);a.due+=Math.max(0,n(d.salesValue)-n(d.receivedSalesPayment));a.payable+=Math.max(0,n(d.purchaseValue)-n(d.paidPurchasePayment));return a;
 },{trades:0,qty:0,purchaseValue:0,salesValue:0,profit:0,freight:0,paid:0,due:0,payable:0}),[filtered]);
 const statuses=Array.from(new Set(deals.map((d:any)=>d.status).filter(Boolean)));
 return <main className="modulePage tradeHistoryPage">
  <header className="moduleHeader">
   <div><p className="eyebrow">COUNTERPARTY INTELLIGENCE</p><h1>Trade History</h1><p className="muted">Complete commercial history with any seller or buyer — deals, quantities, values, payments and profitability in one place.</p></div>
  </header>
  <section className="tradeSelector modulePanel">
   <div><div><span className="eyebrow">COMPANY / COUNTERPARTY</span><h3>{selected?.name||"Select a company"}</h3><p className="muted">{selected?"All executed trades connected to this company.":"Choose a seller or buyer to open their complete trading history."}</p></div></div>
   <div className="tradeFilters">
    <select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">All companies</option>{counterparties.map((x:any)=><option key={x.id} value={x.id}>{x.name} · {x.roles.join(" / ")}</option>)}</select>
    <select value={role} onChange={e=>setRole(e.target.value)}><option value="all">All relationships</option><option value="seller">We purchased from them</option><option value="buyer">We sold to them</option></select>
    <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map((x:any)=><option key={x}>{x}</option>)}</select>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search trade, material, deal..."/>
   </div>
  </section>
  <section className="moduleCards tradeKpis">
   <div><b>TRADES</b><strong>{stats.trades}</strong><span>Executed / recorded deals</span></div>
   <div><b>QUANTITY</b><strong>{qty(stats.qty)}</strong><span>Total quantity across trades</span></div>
   <div><b>PURCHASE VALUE</b><strong>{money(stats.purchaseValue)}</strong><span>Value bought from counterparties</span></div>
   <div><b>SALES VALUE</b><strong>{money(stats.salesValue)}</strong><span>Value sold to counterparties</span></div>
   <div><b>PROFIT</b><strong>{money(stats.profit)}</strong><span>Recorded trade profit</span></div>
   <div><b>NET OUTSTANDING</b><strong>{money(stats.due-stats.payable)}</strong><span>Receivable less payable in filtered trades</span></div>
  </section>
  <section className="modulePanel">
   <div className="panelHead"><div><h3>{selected?.name||"All trade records"}</h3><p>Every trade retains its commercial context and linked records.</p></div><span className="status">{filtered.length} records</span></div>
   <div className="tableWrap"><table><thead><tr><th>Date</th><th>Deal</th><th>Relationship</th><th>Material</th><th>Qty</th><th>Buy Value</th><th>Sell Value</th><th>Profit</th><th>Payments</th><th>Status</th><th></th></tr></thead><tbody>
    {filtered.map((d:any)=><tr key={d.id}>
      <td>{new Date(d.createdAt).toLocaleDateString("en-IN")}</td>
      <td><Link className="dealLink" href={"/deals/"+d.id}><b>{d.id.slice(0,10)}</b><small>{d.procurementType}</small></Link></td>
      <td><span className="tradeRole">{d.role==="seller"?"Supplier / Seller":"Customer / Buyer"}</span><small>{d.counterpartyName}</small></td>
      <td><button className="tradeExpandBtn" onClick={()=>setExpanded(expanded===d.id+"-"+d.role?null:d.id+"-"+d.role)}><b>{d.material?.name}</b><small>{[d.material?.grade,d.material?.specification].filter(Boolean).join(" · ")} · {expanded===d.id+"-"+d.role?"Hide details":"View details"}</small></button></td>
      <td>{qty(d.quantity,d.material?.unit||"KG")}</td>
      <td>{money(d.purchaseValue)}</td><td>{money(d.salesValue)}</td><td className={n(d.profit)>=0?"profitPositive":"profitNegative"}>{money(d.profit)}</td>
      <td><small>Paid {money(d.paid)}</small><small>Due {money(Math.max(0,n(d.salesValue)-n(d.receivedSalesPayment)))}</small></td>
      <td><span className="status">{d.status}</span></td><td><Link className="secondaryBtn" href={"/deals/"+d.id}>Open</Link></td>
    </tr>
    {expanded===d.id+"-"+d.role&&<tr><td colSpan={11}><div className="tradeDetailPanel">
      <div><b>Supply sources</b>{d.details.sources.length?d.details.sources.map((s:any,i:number)=><p key={i}>{s.seller} · {qty(s.quantity)} · {money(s.buyRate)}/unit · {s.location}</p>):<p>—</p>}</div>
      <div><b>Purchase records</b>{d.details.purchases.length?d.details.purchases.map((p:any)=><p key={p.reference}>{p.reference} · {qty(p.quantity)} · {money(p.rate)}/unit · {p.status} · Paid {money(p.payments.reduce((x:number,v:number)=>x+v,0))}</p>):<p>None recorded</p>}</div>
      <div><b>Sales records</b>{d.details.sales.length?d.details.sales.map((s:any)=><p key={s.reference}>{s.reference} · {qty(s.quantity)} · {money(s.rate)}/unit · {s.status} · Received {money(s.payments.reduce((x:number,v:number)=>x+v,0))}</p>):<p>None recorded</p>}</div>
      <div className="tradeDetailActions"><span>Freight / loading / other: {money(d.freight)}</span><Link className="saveBtn" href={"/deals/"+d.id}>Open complete deal workspace</Link></div>
    </div></td></tr> )}
    {!filtered.length&&<tr><td colSpan={11} className="emptyRegister">No trade records match the selected company and filters.</td></tr>}
   </tbody></table></div>
  </section>
  {selected&&<section className="modulePanel tradeBreakdown"><div className="panelHead"><div><h3>Company relationship summary</h3><p>Use this section to quickly understand the commercial relationship.</p></div></div><div className="tradeSummaryGrid">
   <div><span>We bought from them</span><strong>{filtered.filter((d:any)=>d.role==="seller").length} trades · {money(filtered.filter((d:any)=>d.role==="seller").reduce((x:number,d:any)=>x+n(d.purchaseValue),0))}</strong></div>
   <div><span>We sold to them</span><strong>{filtered.filter((d:any)=>d.role==="buyer").length} trades · {money(filtered.filter((d:any)=>d.role==="buyer").reduce((x:number,d:any)=>x+n(d.salesValue),0))}</strong></div>
   <div><span>Total business value</span><strong>{money(stats.purchaseValue+stats.salesValue)}</strong></div>
   <div><span>Profit generated</span><strong>{money(stats.profit)}</strong></div>
  </div></section>}
 </main>;
}
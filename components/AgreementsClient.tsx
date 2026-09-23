"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const money=(v:any)=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const statuses=["All","Draft","Sent","Confirmed","Signed","Expired","Cancelled"];

export default function AgreementsClient({companyId,companyName,agreements:initialAgreements,deals,dealNumbers}:any){
  const [agreements,setAgreements]=useState(initialAgreements);
  const [status,setStatus]=useState("All");
  const [side,setSide]=useState("All");
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [form,setForm]=useState({dealId:"",side:"SELLER",validFrom:"",validUntil:"",terms:""});
  const filtered=useMemo(()=>agreements.filter((a:any)=>(status==="All"||a.status===status)&&(side==="All"||a.side===side)),[agreements,status,side]);
  const stats=useMemo(()=>({
    total:agreements.length,
    active:agreements.filter((a:any)=>["Sent","Confirmed"].includes(a.status)).length,
    signed:agreements.filter((a:any)=>a.status==="Signed").length,
    pending:agreements.filter((a:any)=>["Draft","Sent"].includes(a.status)).length
  }),[agreements]);

  function newAgreement(){
    setForm({dealId:deals[0]?.id||"",side:"SELLER",validFrom:new Date().toISOString().slice(0,10),validUntil:"",terms:""});
    setMessage("");setOpen(true);
  }

  async function create(){
    if(!form.dealId) return setMessage("Select a deal.");
    setSaving(true);setMessage("");
    try{
      const res=await fetch("/api/agreements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        companyId,dealId:form.dealId,side:form.side,status:"Draft",
        validFrom:form.validFrom||undefined,validUntil:form.validUntil||undefined,
        termsJson:form.terms?{terms:form.terms}:undefined
      })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.detail||data.error||"Could not create agreement.");
      const deal=deals.find((d:any)=>d.id===form.dealId);
      setAgreements((prev:any[])=>[{...data,deal},...prev]);
      setOpen(false);setMessage("Agreement created as Draft.");
    }catch(e:any){setMessage(e.message)}
    finally{setSaving(false)}
  }

  async function updateStatus(a:any,next:string){
    setMessage("");
    const res=await fetch("/api/agreements",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,status:next})});
    const data=await res.json();
    if(!res.ok){setMessage(data.detail||data.error||"Could not update agreement.");return}
    setAgreements((prev:any[])=>prev.map(x=>x.id===a.id?{...x,...data}:x));
  }

  return <main className="modulePage agreementsPage">
    <header className="moduleHeader">
      <div><p className="eyebrow">COMMERCIAL CONTROL</p><h1>Agreements</h1><p className="muted">{companyName} · Seller and buyer commitments connected to deals.</p></div>
      <div className="moduleActions"><Link className="secondaryBtn" href="/deals">View deals</Link><button className="moduleAdd" onClick={newAgreement}>+ New Agreement</button></div>
    </header>

    <section className="moduleCards agreementKpis">
      <div><b>TOTAL AGREEMENTS</b><strong>{stats.total}</strong><span>All agreement records</span></div>
      <div><b>AWAITING ACTION</b><strong>{stats.pending}</strong><span>Draft or sent for confirmation</span></div>
      <div><b>CONFIRMED</b><strong>{stats.active}</strong><span>Commercially confirmed</span></div>
      <div><b>SIGNED</b><strong>{stats.signed}</strong><span>Completed commitments</span></div>
    </section>

    <section className="modulePanel">
      <div className="panelHead">
        <div><h3>Agreement register</h3><p>Each agreement is tied to a deal, side, version and validity period.</p></div>
        <div className="agreementFilters">
          <select value={side} onChange={e=>setSide(e.target.value)}><option>All</option><option value="SELLER">Seller side</option><option value="BUYER">Buyer side</option></select>
          <select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select>
        </div>
      </div>
      {message&&<div className="workspaceNotice">{message}</div>}
      <div className="tableWrap"><table>
        <thead><tr><th>Deal</th><th>Counterparty</th><th>Side</th><th>Material</th><th>Version</th><th>Status</th><th>Valid until</th><th>Action</th></tr></thead>
        <tbody>{filtered.map((a:any)=>{
          const party=a.side==="SELLER"?a.deal?.seller?.name:a.deal?.buyer?.name;
          return <tr key={a.id}>
            <td><Link className="dealLink" href={"/deals/"+a.dealId}><b>{dealNumbers[a.dealId]||a.dealId}</b></Link><small>{a.deal?.procurementType||"Deal"}</small></td>
            <td>{party||"—"}</td>
            <td><span className="agreementSide">{a.side==="SELLER"?"Seller":"Buyer"}</span></td>
            <td><b>{a.deal?.material?.name||"—"}</b></td>
            <td>v{a.version}</td>
            <td><span className={"statusPill status-"+String(a.status).toLowerCase().replace(/\s+/g,"-")}>{a.status}</span></td>
            <td>{a.validUntil?new Date(a.validUntil).toLocaleDateString("en-IN"):"Open"}</td>
            <td><select className="agreementStatusSelect" value={a.status} onChange={e=>updateStatus(a,e.target.value)}><option>Draft</option><option>Sent</option><option>Confirmed</option><option>Signed</option><option>Expired</option><option>Cancelled</option></select></td>
          </tr>
        })}{!filtered.length&&<tr><td colSpan={8} className="emptyState">No agreements match the selected filters.</td></tr>}</tbody>
      </table></div>
    </section>

    {open&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div className="recordModal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modalHead"><div><p className="eyebrow">COMMERCIAL CONTROL</p><h2>New Agreement</h2></div><button className="modalClose" onClick={()=>setOpen(false)}>×</button></div>
        <div className="formGrid">
          <label>Deal<select value={form.dealId} onChange={e=>setForm({...form,dealId:e.target.value})}><option value="">Select deal</option>{deals.map((d:any)=><option key={d.id} value={d.id}>{dealNumbers[d.id]||d.id} · {d.material?.name||""} · {d.buyer?.name||"No buyer"}</option>)}</select></label>
          <label>Agreement side<select value={form.side} onChange={e=>setForm({...form,side:e.target.value})}><option value="SELLER">Seller</option><option value="BUYER">Buyer</option></select></label>
          <label>Valid from<input type="date" value={form.validFrom} onChange={e=>setForm({...form,validFrom:e.target.value})}/></label>
          <label>Valid until<input type="date" value={form.validUntil} onChange={e=>setForm({...form,validUntil:e.target.value})}/></label>
          <label className="formSpan2">Terms<textarea value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})} placeholder="Payment terms, delivery terms, validity, quantity, rate, responsibilities..."/></label>
        </div>
        <div className="modalFoot"><button className="secondaryBtn" onClick={()=>setOpen(false)}>Cancel</button><button className="saveBtn" disabled={saving} onClick={create}>{saving?"Creating...":"Create agreement"}</button></div>
      </div>
    </div>}
  </main>;
}

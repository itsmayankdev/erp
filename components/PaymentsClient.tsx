"use client";

import { useMemo, useState } from "react";

const money=(v:any)=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});

export default function PaymentsClient({companyId,initialRows,documents}:any){
 const [rows,setRows]=useState(initialRows);
 const [open,setOpen]=useState(false);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [filter,setFilter]=useState("all");
 const [form,setForm]=useState({type:"Received",documentId:"",reference:"",amount:"",dueDate:"",notes:""});

 const filtered=useMemo(()=>rows.filter((r:any)=>{
   if(filter==="received") return ["Received","RECEIPT"].includes(r.type);
   if(filter==="paid") return ["Paid","PAYMENT"].includes(r.type);
   return true;
 }),[rows]);

 const received=rows.filter((r:any)=>["Received","RECEIPT"].includes(r.type)).reduce((a:number,r:any)=>a+Number(r.amount||0),0);
 const paid=rows.filter((r:any)=>["Paid","PAYMENT"].includes(r.type)).reduce((a:number,r:any)=>a+Number(r.amount||0),0);

 async function save(){
   if(!form.documentId||!form.amount){setMessage("Select a linked document and enter the payment amount.");return;}
   setSaving(true);setMessage("");
   const doc=documents.find((d:any)=>d.id===form.documentId);
   const payload:any={companyId,type:form.type,amount:Number(form.amount),reference:form.reference||undefined,dueDate:form.dueDate||undefined,notes:form.notes||undefined};
   if(doc.kind==="purchase") payload.purchaseId=doc.id;
   else {payload.salesOrderId=doc.id;payload.buyerId=doc.buyerId;}
   const res=await fetch("/api/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await res.json();
   setSaving(false);
   if(!res.ok){setMessage(data.detail||data.error||"Could not record payment.");return;}
   setRows((prev:any[])=>[data,...prev]);
   setForm({type:"Received",documentId:"",reference:"",amount:"",dueDate:"",notes:""});
   setOpen(false);setMessage("Payment recorded and linked to the commercial document.");
 }

 return <>
  <section className="moduleCards paymentKpis">
   <div><b>PAYMENT RECORDS</b><strong>{rows.length}</strong><span>Recorded transactions</span></div>
   <div><b>RECEIVED</b><strong>{money(received)}</strong><span>Customer receipts</span></div>
   <div><b>PAID</b><strong>{money(paid)}</strong><span>Supplier payments</span></div>
   <div><b>NET CASH MOVEMENT</b><strong>{money(received-paid)}</strong><span>Receipts less payments</span></div>
  </section>
  <section className="modulePanel">
   <div className="panelHead">
    <div><h3>Payment register</h3><p>Every payment is linked to the purchase or sales order it settles.</p></div>
    <div className="paymentActions">
      <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All payments</option><option value="received">Received</option><option value="paid">Paid</option></select>
      <button className="moduleAdd" onClick={()=>setOpen(true)}>+ Record payment</button>
    </div>
   </div>
   {message&&<div className="workspaceNotice">{message}</div>}
   <div className="tableWrap"><table><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Counterparty</th><th>Linked document</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
   <tbody>{filtered.map((r:any)=>{
    const counterparty=r.buyer?.name||r.purchase?.seller?.name||r.salesOrder?.buyer?.name||"—";
    const linked=r.purchase?.reference||r.salesOrder?.reference||"Unlinked";
    return <tr key={r.id}><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td><td><b>{r.reference}</b></td><td>{r.type}</td><td>{counterparty}</td><td>{linked}</td><td><b>{money(r.amount)}</b></td><td>{r.dueDate?new Date(r.dueDate).toLocaleDateString("en-IN"):"—"}</td><td><span className={"statusPill status-"+String(r.status||"Pending").toLowerCase().replace(/\s+/g,"-")}>{r.status||"Pending"}</span></td></tr>
   })}{!filtered.length&&<tr><td colSpan={8} className="emptyState">No payment records match this filter.</td></tr>}</tbody></table></div>
  </section>

  {open&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <div className="recordModal">
    <div className="modalHead"><div><p className="eyebrow">FINANCE</p><h2>Record payment</h2></div><button className="modalClose" onClick={()=>setOpen(false)}>×</button></div>
    <div className="formGrid">
      <label>Payment type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="Received">Received from customer</option><option value="Paid">Paid to supplier</option></select></label>
      <label>Linked document<select value={form.documentId} onChange={e=>setForm({...form,documentId:e.target.value})}><option value="">Select purchase / sales order</option>{documents.filter((d:any)=>form.type==="Received"?d.kind==="salesOrder":d.kind==="purchase").map((d:any)=><option key={d.kind+"-"+d.id} value={d.id}>{d.reference} · {d.party} · {money(d.total)}</option>)}</select></label>
      <label>Amount<input type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0"/></label>
      <label>Reference<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} placeholder="Optional"/></label>
      <label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
      <label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional note"/></label>
    </div>
    <div className="modalFoot"><button className="secondaryBtn" onClick={()=>setOpen(false)}>Cancel</button><button className="saveBtn" disabled={saving} onClick={save}>{saving?"Saving...":"Record payment"}</button></div>
   </div>
  </div>}
 </>;
}

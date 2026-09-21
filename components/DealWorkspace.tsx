"use client";

import { useState } from "react";
import { FileCheck2, PackageCheck, Truck, CreditCard, Pencil, Plus, RefreshCw } from "lucide-react";

export default function DealWorkspace({deal,payments,masters}:any){
  const [tab,setTab]=useState("overview");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const money=(n:any)=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0});
  const qty=Number(deal.quantity||0);
  const expectedCost=Number(deal.expectedLandedCost||0);
  const expectedRevenue=qty*Number(deal.sellRate||0);
  const expectedProfit=Number(deal.expectedProfit||0);
  const tabs=["overview","commercial","agreements","purchase","inventory","sales","payments","activity"];

  async function post(url:string,body:any){
    setBusy(true);setMessage("");
    try{
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!r.ok) throw new Error(data.detail||data.error||"Action failed");
      setMessage("Action completed successfully.");
      setTimeout(()=>location.reload(),500);
    }catch(e:any){setMessage(e.message)}
    finally{setBusy(false)}
  }

  const createAgreement=(side:"SELLER"|"BUYER")=>post("/api/agreements",{companyId:deal.companyId,dealId:deal.id,side,status:"Draft"});
  const createPurchase=()=>{
    const warehouse=masters.warehouses[0];
    if(!warehouse) return setMessage("Create a warehouse first.");
    post("/api/purchases",{companyId:deal.companyId,dealId:deal.id,sellerId:deal.sellerId,materialId:deal.materialId,warehouseId:warehouse.id,reference:"PUR-"+Date.now(),purchaseType:deal.procurementType,quantity:qty,rate:Number(deal.buyRate),freightCost:Number(deal.freightCost||0),loadingCost:Number(deal.loadingCost||0),otherCost:Number(deal.otherCost||0),status:"Received"});
  };
  const createSale=()=>{
    if(!deal.buyerId) return setMessage("Assign a buyer to this deal before creating a sales order.");
    post("/api/sales-orders",{companyId:deal.companyId,dealId:deal.id,buyerId:deal.buyerId,materialId:deal.materialId,reference:"SO-"+Date.now(),quantity:qty,rate:Number(deal.sellRate||0),status:"Confirmed"});
  };

  return <div className="workspace">
    <section className="dealSummary">
      <div><span>STATUS</span><strong>{deal.status}</strong></div>
      <div><span>QUANTITY</span><strong>{qty.toLocaleString("en-IN")} {deal.material.unit}</strong></div>
      <div><span>BUY RATE</span><strong>{money(deal.buyRate)}/{deal.material.unit.toLowerCase()}</strong></div>
      <div><span>SELL RATE</span><strong>{deal.sellRate?money(deal.sellRate):"—"}</strong></div>
      <div><span>EXPECTED PROFIT</span><strong className={expectedProfit>=0?"positive":"negative"}>{money(expectedProfit)}</strong></div>
      <div><span>CAPITAL EXPOSURE</span><strong>{deal.capitalExposure?"YES":"NO"}</strong></div>
    </section>

    <section className="workspacePanel">
      <div className="workspaceTabs">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>
      {message&&<div className="workspaceNotice">{message}</div>}

      {tab==="overview"&&<div className="workspaceGrid">
        <div className="workspaceCard"><h3>Deal parties</h3><Row label="Seller" value={deal.seller.name}/><Row label="Buyer" value={deal.buyer?.name||"Not matched"}/><Row label="Material" value={deal.material.name}/><Row label="Grade" value={deal.material.grade||"—"}/><Row label="Procurement" value={deal.procurementType}/></div>
        <div className="workspaceCard"><h3>Commercial snapshot</h3><Row label="Purchase value" value={money(qty*Number(deal.buyRate))}/><Row label="Landed cost" value={money(expectedCost)}/><Row label="Expected sales" value={money(expectedRevenue)}/><Row label="Expected profit" value={money(expectedProfit)}/><Row label="Expected margin" value={deal.expectedMargin?Number(deal.expectedMargin).toFixed(1)+"%":"—"}/></div>
        <div className="workspaceCard"><h3>Commitments</h3><Row label="Seller" value={deal.sellerCommitted?"Committed":"Pending"}/><Row label="Buyer" value={deal.buyerCommitted?"Committed":"Pending"}/><Row label="Seller agreement" value={deal.agreementSeller?"Created":"Not created"}/><Row label="Buyer agreement" value={deal.agreementBuyer?"Created":"Not created"}/></div>
        <div className="workspaceCard"><h3>Linked records</h3><Row label="Opportunity" value={deal.opportunity?.id?.slice(0,10)||"—"}/><Row label="Buyer demand" value={deal.demand?.id?.slice(0,10)||"—"}/><Row label="Purchases" value={deal.purchases.length}/><Row label="Sales orders" value={deal.salesOrders.length}/><Row label="Stock records" value={deal.stocks.length}/></div>
      </div>}

      {tab==="commercial"&&<div className="workspaceGrid"><div className="workspaceCard"><h3>Cost build-up</h3><Row label="Material purchase" value={money(qty*Number(deal.buyRate))}/><Row label="Freight" value={money(deal.freightCost)}/><Row label="Loading" value={money(deal.loadingCost)}/><Row label="Other" value={money(deal.otherCost)}/><Row label="Expected landed cost" value={money(expectedCost)}/></div><div className="workspaceCard"><h3>Profitability</h3><Row label="Expected revenue" value={money(expectedRevenue)}/><Row label="Expected profit" value={money(expectedProfit)}/><Row label="Margin" value={deal.expectedMargin?Number(deal.expectedMargin).toFixed(2)+"%":"—"}/><Row label="Profit / KG" value={qty?money(expectedProfit/qty):"—"}/></div></div>}

      {tab==="agreements"&&<ActionSection title="Agreements" icon={<FileCheck2 size={16}/>} actions={<><button onClick={()=>createAgreement("SELLER")} disabled={busy}><Plus size={14}/> Seller Agreement</button><button onClick={()=>createAgreement("BUYER")} disabled={busy}><Plus size={14}/> Buyer Agreement</button></>}><DataTable rows={deal.agreements} cols={["side","status","version","validUntil"]}/></ActionSection>}

      {tab==="purchase"&&<ActionSection title="Procurement" icon={<PackageCheck size={16}/>} actions={<button onClick={createPurchase} disabled={busy}><Plus size={14}/> Receive Purchase</button>}><DataTable rows={deal.purchases} cols={["reference","purchaseType","quantity","rate","status"]}/></ActionSection>}

      {tab==="inventory"&&<ActionSection title="Inventory" icon={<PackageCheck size={16}/>}><DataTable rows={deal.stocks} cols={["warehouse","quantity","reservedQty","unitCost","status"]} nested/></ActionSection>}

      {tab==="sales"&&<ActionSection title="Sales & dispatch" icon={<Truck size={16}/>} actions={<button onClick={createSale} disabled={busy}><Plus size={14}/> Create Sales Order</button>}><DataTable rows={deal.salesOrders} cols={["reference","quantity","rate","status","dispatchDate"]}/></ActionSection>}

      {tab==="payments"&&<ActionSection title="Payments" icon={<CreditCard size={16}/>}><DataTable rows={payments} cols={["reference","type","amount","dueDate","status"]}/></ActionSection>}

      {tab==="activity"&&<ActionSection title="Deal activity"><div className="activityLine"><span>Deal created</span><small>{new Date(deal.createdAt).toLocaleString("en-IN")}</small></div><div className="activityLine"><span>Last updated</span><small>{new Date(deal.updatedAt).toLocaleString("en-IN")}</small></div></ActionSection>}
    </section>
  </div>;
}

function Row({label,value}:any){return <div className="detailRow"><span>{label}</span><b>{value}</b></div>}
function ActionSection({title,icon,actions,children}:any){return <div className="workspaceSection"><div className="workspaceSectionHead"><div><h3>{icon}{title}</h3><p>Connected records for this deal</p></div><div className="workspaceSectionActions">{actions}</div></div>{children}</div>}
function DataTable({rows,cols,nested}:any){return <div className="tableWrap"><table><thead><tr>{cols.map((c:string)=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={r.id||r.reference||i}>{cols.map((c:string)=><td key={c}>{typeof r[c]==="object"&&r[c] ? r[c].name : c.toLowerCase().includes("date")&&r[c] ? new Date(r[c]).toLocaleDateString("en-IN") : c==="amount"||c==="rate"||c==="unitCost" ? "₹"+Number(r[c]||0).toLocaleString("en-IN") : c==="quantity"||c==="reservedQty" ? Number(r[c]||0).toLocaleString("en-IN") : String(r[c]??"—")}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={cols.length}>No records linked yet.</td></tr>}</tbody></table></div>}

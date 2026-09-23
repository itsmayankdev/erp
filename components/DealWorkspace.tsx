"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, PackageCheck, Truck, CreditCard, Pencil, Plus, RefreshCw } from "lucide-react";

export default function DealWorkspace({deal,payments,masters,dealNumber}:any){
  const router=useRouter();
  const [tab,setTab]=useState("overview");
  const [paymentForm,setPaymentForm]=useState<{open:boolean;amount:string;type:"Receivable"|"Payable"}>({open:false,amount:"",type:"Receivable"});
  const [receiveForm,setReceiveForm]=useState<{open:boolean;source:any;quantity:string}>({open:false,source:null,quantity:""});
  const [busy,setBusy]=useState(false);
  const [editingCommercial,setEditingCommercial]=useState(false);
  const [commercial,setCommercial]=useState({quantity:String(deal.quantity||""),buyRate:String(deal.buyRate||""),sellRate:String(deal.sellRate??""),freightCost:String(deal.freightCost||0),loadingCost:String(deal.loadingCost||0),otherCost:String(deal.otherCost||0)});
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
      router.refresh();
    }catch(e:any){setMessage(e.message)}
    finally{setBusy(false)}
  }

  async function saveCommercial(){
    setBusy(true); setMessage("");
    try{
      const response=await fetch("/api/deals",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id:deal.id,
        quantity:Number(commercial.quantity),
        buyRate:Number(commercial.buyRate),
        sellRate:commercial.sellRate===""?null:Number(commercial.sellRate),
        freightCost:Number(commercial.freightCost||0),
        loadingCost:Number(commercial.loadingCost||0),
        otherCost:Number(commercial.otherCost||0)
      })});
      const data=await response.json();
      if(!response.ok) throw new Error(data.detail||data.error||"Could not save commercial details.");
      setEditingCommercial(false); setMessage("Commercial details updated."); router.refresh();
    }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
  }

  function openPaymentForm(){ setPaymentForm({open:true,amount:"",type:"Receivable"}); }
  async function submitPayment(){
    const numeric=Number(paymentForm.amount);
    if(!numeric || numeric<=0) return setMessage("Enter a valid payment amount.");
    const type=paymentForm.type;
    const reference=(type==="Payable"?"PAY-":"REC-")+Date.now();
    const purchaseId=deal.purchases[0]?.id;
    const salesOrderId=deal.salesOrders[0]?.id;
    setPaymentForm(v=>({...v,open:false}));
    await post("/api/payments",{
      companyId:deal.companyId,
      buyerId:deal.buyerId||null,
      purchaseId: type==="Payable" ? purchaseId : null,
      salesOrderId: type==="Receivable" ? salesOrderId : null,
      reference,
      type:type==="Payable"?"Paid":"Received",
      amount:numeric,
      status:"Paid",
      paidAt:new Date().toISOString()
    });
  }

  async function dispatchLatestSale(){
    const sale=deal.salesOrders[0];
    if(!sale) return setMessage("Create a sales order first.");
    setBusy(true); setMessage("");
    try{
      const response=await fetch("/api/sales-orders/"+sale.id+"/dispatch",{method:"POST",headers:{"Content-Type":"application/json"}});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Could not dispatch the sales order.");
      setMessage("Sales order dispatched. Central inventory and stock usage records were updated."); router.refresh();
    }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
  }

  const createAgreement=(side:"SELLER"|"BUYER")=>post("/api/agreements",{companyId:deal.companyId,dealId:deal.id,side,status:"Draft"});
  const createPurchase=()=>{
    const warehouse=masters.warehouses[0];
    if(!warehouse) return setMessage("Create a warehouse first.");
    post("/api/purchases",{companyId:deal.companyId,dealId:deal.id,sellerId:deal.sellerId,materialId:deal.materialId,warehouseId:warehouse.id,reference:"PUR-"+Date.now(),purchaseType:deal.procurementType,quantity:qty,rate:Number(deal.buyRate),freightCost:Number(deal.freightCost||0),loadingCost:Number(deal.loadingCost||0),otherCost:Number(deal.otherCost||0),status:"Received"});
  };

  const receiveSource=async(source:any)=>{
    const warehouse=masters.warehouses[0];
    if(!warehouse) return setMessage("Create a warehouse first.");
    const received=(deal.purchases||[]).filter((p:any)=>p.dealSourceId===source.id&&p.status==="Received").reduce((sum:number,p:any)=>sum+Number(p.quantity||0),0);
    const remaining=Math.max(0,Number(source.quantity)-received);
    if(remaining<=0) return setMessage("This supply source is fully received.");
    setReceiveForm({open:true,source,quantity:String(remaining)});
  };

  async function submitReceive(){
    const source=receiveForm.source;
    if(!source) return;
    const quantity=Number(receiveForm.quantity);
    const received=(deal.purchases||[]).filter((p:any)=>p.dealSourceId===source.id&&p.status==="Received").reduce((sum:number,p:any)=>sum+Number(p.quantity||0),0);
    const remaining=Math.max(0,Number(source.quantity)-received);
    if(!quantity||quantity<=0||quantity>remaining) return setMessage("Enter a quantity between 1 and "+remaining.toLocaleString("en-IN")+".");
    const warehouse=masters.warehouses[0];
    if(!warehouse) return setMessage("Create a warehouse first.");
    setReceiveForm({open:false,source:null,quantity:""});
    await post("/api/purchases",{
      companyId:deal.companyId,dealId:deal.id,dealSourceId:source.id,
      sellerId:source.sellerId,materialId:deal.materialId,warehouseId:warehouse.id,
      reference:"PUR-"+Date.now(),purchaseType:deal.procurementType,quantity,
      rate:Number(source.buyRate),freightCost:Number(deal.freightCost||0),
      loadingCost:Number(deal.loadingCost||0),otherCost:Number(deal.otherCost||0),status:"Received"
    });
  };
  const createSale=()=>{
    if(!deal.buyerId) return setMessage("Assign a buyer to this deal before creating a sales order.");
    post("/api/sales-orders",{companyId:deal.companyId,dealId:deal.id,buyerId:deal.buyerId,materialId:deal.materialId,reference:"SO-"+Date.now(),quantity:qty,rate:Number(deal.sellRate||0),status:"Confirmed"});
  };

  return <div className="workspace">
    {paymentForm.open&&<div className="modalBackdrop" onMouseDown={()=>setPaymentForm(v=>({...v,open:false}))}>
      <div className="recordModal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modalHead"><div><p className="eyebrow">PAYMENT</p><h2>Record payment</h2></div><button className="modalClose" onClick={()=>setPaymentForm(v=>({...v,open:false}))}>×</button></div>
        <div className="formGrid">
          <label>Payment type<select value={paymentForm.type} onChange={e=>setPaymentForm(v=>({...v,type:e.target.value as "Receivable"|"Payable"}))}><option value="Receivable">Receivable — money from buyer</option><option value="Payable">Payable — money to supplier</option></select></label>
          <label>Amount (₹)<input autoFocus type="number" min="0" value={paymentForm.amount} onChange={e=>setPaymentForm(v=>({...v,amount:e.target.value}))} placeholder="Enter amount"/></label>
        </div>
        <div className="modalFoot"><button className="secondaryBtn" onClick={()=>setPaymentForm(v=>({...v,open:false}))}>Cancel</button><button className="saveBtn" onClick={submitPayment} disabled={busy}>Record payment</button></div>
      </div>
    </div>}
    {receiveForm.open&&<div className="modalBackdrop" onMouseDown={()=>setReceiveForm(v=>({...v,open:false}))}>
      <div className="recordModal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modalHead"><div><p className="eyebrow">PROCUREMENT</p><h2>Receive stock</h2><p className="muted">{receiveForm.source?.seller?.name||"Supplier"} · {receiveForm.source?.location||"Location not set"}</p></div><button className="modalClose" onClick={()=>setReceiveForm(v=>({...v,open:false}))}>×</button></div>
        <div className="formGrid"><label>Quantity ({deal.material.unit})<input autoFocus type="number" min="1" value={receiveForm.quantity} onChange={e=>setReceiveForm(v=>({...v,quantity:e.target.value}))}/></label></div>
        <div className="modalFoot"><button className="secondaryBtn" onClick={()=>setReceiveForm(v=>({...v,open:false}))}>Cancel</button><button className="saveBtn" onClick={submitReceive} disabled={busy}>Receive stock</button></div>
      </div>
    </div>}

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

      {tab==="commercial"&&<div className="workspaceGrid">
        <div className="workspaceCard">
          <div className="cardTitleRow"><h3>Cost build-up</h3><button className="secondaryBtn" onClick={()=>setEditingCommercial(v=>!v)}><Pencil size={13}/>{editingCommercial?"Cancel":"Edit"}</button></div>
          {editingCommercial ? <div className="workspaceEditGrid">
            <label>Quantity<input type="number" value={commercial.quantity} onChange={e=>setCommercial({...commercial,quantity:e.target.value})}/></label>
            <label>Buy rate<input type="number" value={commercial.buyRate} onChange={e=>setCommercial({...commercial,buyRate:e.target.value})}/></label>
            <label>Sell rate<input type="number" value={commercial.sellRate} onChange={e=>setCommercial({...commercial,sellRate:e.target.value})} placeholder="Optional"/></label>
            <label>Freight<input type="number" value={commercial.freightCost} onChange={e=>setCommercial({...commercial,freightCost:e.target.value})}/></label>
            <label>Loading<input type="number" value={commercial.loadingCost} onChange={e=>setCommercial({...commercial,loadingCost:e.target.value})}/></label>
            <label>Other cost<input type="number" value={commercial.otherCost} onChange={e=>setCommercial({...commercial,otherCost:e.target.value})}/></label>
            <button className="saveBtn" onClick={saveCommercial} disabled={busy}>Save commercial details</button>
          </div> : <>
            <Row label="Material purchase" value={money(qty*Number(deal.buyRate))}/><Row label="Freight" value={money(deal.freightCost)}/><Row label="Loading" value={money(deal.loadingCost)}/><Row label="Other" value={money(deal.otherCost)}/><Row label="Expected landed cost" value={money(expectedCost)}/>
          </>}
        </div>
        <div className="workspaceCard"><h3>Profitability</h3><Row label="Expected revenue" value={money(expectedRevenue)}/><Row label="Expected profit" value={money(expectedProfit)}/><Row label="Margin" value={deal.expectedMargin?Number(deal.expectedMargin).toFixed(2)+"%":"—"}/><Row label="Profit / KG" value={qty?money(expectedProfit/qty):"—"}/></div>
      </div>}

      {tab==="agreements"&&<ActionSection title="Agreements" icon={<FileCheck2 size={16}/>} actions={<><button onClick={()=>createAgreement("SELLER")} disabled={busy}><Plus size={14}/> Seller Agreement</button><button onClick={()=>createAgreement("BUYER")} disabled={busy}><Plus size={14}/> Buyer Agreement</button></>}><DataTable rows={deal.agreements} cols={["side","status","version","validUntil"]}/></ActionSection>}

      {tab==="purchase"&&<>
  {deal.dealSources?.length>0 ? <ActionSection title="Source-wise procurement" icon={<PackageCheck size={16}/>}><div className="workspaceGrid">
    {deal.dealSources.map((source:any)=>{
      const received=(deal.purchases||[]).filter((p:any)=>p.dealSourceId===source.id&&p.status==="Received").reduce((sum:number,p:any)=>sum+Number(p.quantity||0),0);
      const remaining=Math.max(0,Number(source.quantity)-received);
      return <div className="workspaceCard" key={source.id}>
        <div className="cardTitleRow"><h3>{source.seller?.name||"Supplier"}</h3><span className="muted">{source.location||"—"}</span></div>
        <Row label="Committed source" value={Number(source.quantity).toLocaleString("en-IN")+" "+deal.material.unit}/>
        <Row label="Buy rate" value={money(source.buyRate)+"/"+deal.material.unit.toLowerCase()}/>
        <Row label="Received" value={received.toLocaleString("en-IN")+" "+deal.material.unit}/>
        <Row label="Remaining" value={remaining.toLocaleString("en-IN")+" "+deal.material.unit}/>
        <button className="saveBtn" onClick={()=>receiveSource(source)} disabled={busy||remaining<=0}><PackageCheck size={14}/> {remaining<=0?"Fully Received":"Receive Stock"}</button>
      </div>
    })}
  </div></ActionSection> : <ActionSection title="Procurement" icon={<PackageCheck size={16}/>} actions={<button onClick={createPurchase} disabled={busy}><Plus size={14}/> Receive Purchase</button>}>
    <DataTable rows={deal.purchases} cols={["reference","purchaseType","quantity","rate","status"]}/>
  </ActionSection>}
  <ActionSection title="Purchase records" icon={<PackageCheck size={16}/>}><DataTable rows={deal.purchases} cols={["reference","dealSource","quantity","rate","status","receivedAt"]} nested/></ActionSection>
</>}

      {tab==="inventory"&&<>
        {deal.dealSources?.length>0&&<ActionSection title="Supply sources" icon={<PackageCheck size={16}/>}><DataTable rows={deal.dealSources} cols={["seller","quantity","buyRate","location"]} nested/></ActionSection>}
        <ActionSection title="Inventory" icon={<PackageCheck size={16}/>}><DataTable rows={deal.stocks} cols={["warehouse","quantity","reservedQty","unitCost","status"]} nested/></ActionSection>
        <ActionSection title="Stock usage audit" icon={<PackageCheck size={16}/>}><DataTable rows={(deal.stocks||[]).flatMap((stock:any)=>(stock.stockAllocations||[]).map((a:any)=>({id:a.id,salesOrderId:a.salesOrderId,warehouse:stock.warehouse,quantity:a.quantity,status:a.status,allocatedAt:a.allocatedAt})))} cols={["salesOrderId","warehouse","quantity","status","allocatedAt"]}/></ActionSection>
      </>}

      {tab==="sales"&&<ActionSection title="Sales & dispatch" icon={<Truck size={16}/>} actions={<><button onClick={createSale} disabled={busy}><Plus size={14}/> Create Sales Order</button><button onClick={dispatchLatestSale} disabled={busy || !deal.salesOrders.length}><Truck size={14}/> Dispatch</button></>}><DataTable rows={deal.salesOrders} cols={["reference","quantity","rate","status","dispatchDate"]}/></ActionSection>}

      {tab==="payments"&&<ActionSection title="Payments" icon={<CreditCard size={16}/>} actions={<button onClick={openPaymentForm} disabled={busy}><Plus size={14}/> Record Payment</button>}><DataTable rows={payments} cols={["reference","type","amount","dueDate","status"]}/></ActionSection>}

      {tab==="activity"&&<ActionSection title="Deal activity"><div className="activityLine"><span>Deal created</span><small>{new Date(deal.createdAt).toLocaleString("en-IN")}</small></div><div className="activityLine"><span>Last updated</span><small>{new Date(deal.updatedAt).toLocaleString("en-IN")}</small></div></ActionSection>}
    </section>
  </div>;
}

function Row({label,value}:any){return <div className="detailRow"><span>{label}</span><b>{value}</b></div>}
function ActionSection({title,icon,actions,children}:any){return <div className="workspaceSection"><div className="workspaceSectionHead"><div><h3>{icon}{title}</h3><p>Connected records for this deal</p></div><div className="workspaceSectionActions">{actions}</div></div>{children}</div>}
function DataTable({rows,cols,nested}:any){return <div className="tableWrap"><table><thead><tr>{cols.map((c:string)=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={r.id||r.reference||i}>{cols.map((c:string)=><td key={c}>{typeof r[c]==="object"&&r[c] ? (r[c].name || r[c].seller?.name || "—") : c.toLowerCase().includes("date")&&r[c] ? new Date(r[c]).toLocaleDateString("en-IN") : c==="amount"||c==="rate"||c==="unitCost" ? "₹"+Number(r[c]||0).toLocaleString("en-IN") : c==="quantity"||c==="reservedQty" ? Number(r[c]||0).toLocaleString("en-IN") : String(r[c]??"—")}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={cols.length}>No records linked yet.</td></tr>}</tbody></table></div>}

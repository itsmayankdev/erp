"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, ArrowRight, Package, MapPin, CheckCircle2, X } from "lucide-react";

export default function SmartMaterialFinder({materials,buyers,demands}:any){
 const [materialId,setMaterialId]=useState(""),[buyerId,setBuyerId]=useState(""),[demandId,setDemandId]=useState("");
 const [query,setQuery]=useState(""),[quantity,setQuantity]=useState(""),[location,setLocation]=useState(""),[maxRate,setMaxRate]=useState("");
 const [results,setResults]=useState<any[]>([]),[summary,setSummary]=useState<any>(null),[loading,setLoading]=useState(false),[selected,setSelected]=useState<any>(null),[working,setWorking]=useState(false);
 const buyerDemands=demands.filter((d:any)=>!buyerId||d.buyerId===buyerId);
 const selectedMaterial=materials.find((m:any)=>m.id===materialId);
 const selectedDemand=demands.find((d:any)=>d.id===demandId);

 function chooseDemand(id:string){
  setDemandId(id); const d=demands.find((x:any)=>x.id===id); if(!d)return;
  setBuyerId(d.buyerId); setMaterialId(d.materialId); setQuantity(String(Number(d.quantity))); setMaxRate(d.targetRate?String(Number(d.targetRate)):""); setLocation(d.location||""); setQuery([d.material?.name,d.material?.grade,d.material?.specification,d.notes].filter(Boolean).join(" "));
 }
 function chooseBuyer(id:string){setBuyerId(id);setDemandId("");}
 async function search(){
  setLoading(true);setSelected(null);
  const p=new URLSearchParams(); if(materialId)p.set("materialId",materialId);if(query)p.set("q",query);if(quantity)p.set("quantity",quantity);if(location)p.set("location",location);if(maxRate)p.set("maxRate",maxRate);if(buyerId)p.set("buyerId",buyerId);if(demandId)p.set("demandId",demandId);
  const r=await fetch("/api/smart-finder?"+p);const d=await r.json();setResults(d.results||[]);setSummary(d.summary||null);setLoading(false);
 }
 async function createDeal(){
  if(!selected?.opportunityId||!demandId)return alert("Select a supplier opportunity and a buyer requirement first.");
  setWorking(true);
  const r=await fetch("/api/workflows/convert-to-deal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({opportunityId:selected.opportunityId,demandId})});
  const d=await r.json();setWorking(false);
  if(!r.ok)return alert(d.error||"Could not create deal.");
  window.location.href="/deals/"+d.deal.id;
 }
 return <div className="finder">
  <section className="finderSearch">
   <div className="finderTitle"><div><span className="eyebrow">SUPPLY MATCHING ENGINE</span><h2>Find supply for a buyer requirement</h2><p>Select an existing buyer requirement and the ERP will pre-fill the material, quantity, target price and location.</p></div><div className="finderIcon"><Search size={19}/></div></div>
   <div className="finderGrid">
    <label>Buyer requirement<select value={demandId} onChange={e=>chooseDemand(e.target.value)}><option value="">Select a saved requirement...</option>{demands.map((d:any)=><option key={d.id} value={d.id}>{d.buyer.name} · {d.material.name} · {Number(d.quantity).toLocaleString("en-IN")} {d.unit}</option>)}</select></label>
    <label>Buyer<select value={buyerId} onChange={e=>chooseBuyer(e.target.value)}><option value="">Any buyer</option>{buyers.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label>Material<select value={materialId} onChange={e=>setMaterialId(e.target.value)}><option value="">Any material</option>{materials.map((m:any)=><option key={m.id} value={m.id}>{m.name}{m.grade?" · "+m.grade:""}</option>)}</select></label>
    <label>Material / size / specification<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. HR Coil 2mm 1250"/></label>
    <label>Required quantity<input type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="e.g. 50000"/></label>
    <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Delhi / Faridabad / Bawal"/></label>
    <label>Maximum buy rate<input type="number" value={maxRate} onChange={e=>setMaxRate(e.target.value)} placeholder="Optional ₹/unit"/></label>
    <label>Saved requirements for buyer<select value="" onChange={e=>chooseDemand(e.target.value)} disabled={!buyerId}><option value="">{buyerId?"Select another requirement...":"Select buyer first"}</option>{buyerDemands.map((d:any)=><option key={d.id} value={d.id}>{d.material.name} · {Number(d.quantity).toLocaleString("en-IN")} {d.unit}</option>)}</select></label>
   </div>
   <button className="finderButton" onClick={search} disabled={loading}><Search size={15}/>{loading?"Searching...":"Find Matching Supply"}</button>
  </section>
  {summary&&<section className="finderStats"><div><span>Matches</span><b>{summary.matches}</b></div><div><span>Requirement</span><b>{summary.requestedQuantity?Number(summary.requestedQuantity).toLocaleString("en-IN"):"—"}</b><small>{summary.buyer||"Manual search"}</small></div><div><span>Lowest rate</span><b>{summary.lowestRate?"₹"+Number(summary.lowestRate).toLocaleString("en-IN"):"—"}</b></div><div><span>Supply coverage</span><b>{summary.requestedQuantity&&summary.totalAvailable>=summary.requestedQuantity?"Covered":"Partial"}</b><small>{Number(summary.totalAvailable).toLocaleString("en-IN")} available</small></div></section>}
  <section className="finderResults">
   <div className="finderResultsHead"><div><h3>Matching supply</h3><p>{selectedMaterial?selectedMaterial.name:"All known materials"} · ranked by quantity, location and price fit</p></div><SlidersHorizontal size={16}/></div>
   {!results.length?<div className="finderEmpty"><Package size={22}/><b>Search the network</b><span>Select a saved buyer requirement or enter material and quantity.</span></div>:
   <div className="supplyList">{results.map((r:any)=><div className={"supplyRow "+(selected?.id===r.id?"selectedSupply":"")} key={r.id+"-"+r.source}>
    <div className="supplyMain"><div className="supplyMaterial"><b>{r.material}</b><span>{r.grade||r.specification||"Specification not recorded"}</span></div><span className="sourceTag">{r.source}</span></div>
    <div><small>AVAILABLE</small><strong>{Number(r.quantity).toLocaleString("en-IN")} {r.unit}</strong></div>
    <div><small>PRICE</small><strong>{r.rate?"₹"+Number(r.rate).toLocaleString("en-IN"):"—"}</strong></div>
    <div><small>SUPPLIER / LOCATION</small><strong>{r.seller||"—"}</strong><span className="rowSub"><MapPin size={10}/>{r.location||"—"}</span></div>
    <div><small>MATCH</small><strong className="matchScore">{r.matchScore}%</strong></div>
    <button className="supplyAction" title="Select supply" onClick={()=>setSelected(r)}>{selected?.id===r.id?<CheckCircle2 size={15}/>:<ArrowRight size={15}/>}</button>
   </div>)}</div>}
  </section>
  {selected&&<section className="finderAction"><div><span className="eyebrow">SELECTED SUPPLY</span><h3>{selected.material} · {Number(selected.quantity).toLocaleString("en-IN")} {selected.unit}</h3><p>{selected.seller} · {selected.location||"Location not recorded"} · {selected.rate?"₹"+Number(selected.rate):"Rate not recorded"}</p></div><div className="finderActionButtons"><button className="secondaryBtn" onClick={()=>setSelected(null)}><X size={13}/> Clear</button>{selected.opportunityId&&demandId&&<button className="saveBtn" onClick={createDeal} disabled={working}>{working?"Creating...":"Create Deal from Match"}<ArrowRight size={13}/></button>}</div></section>}
 </div>;
}
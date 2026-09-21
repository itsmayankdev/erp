"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ArrowRight, Package, MapPin, IndianRupee } from "lucide-react";

export default function SmartMaterialFinder({materials,buyers}:any){
  const [materialId,setMaterialId]=useState("");
  const [buyerId,setBuyerId]=useState("");
  const [query,setQuery]=useState("");
  const [quantity,setQuantity]=useState("");
  const [location,setLocation]=useState("");
  const [maxRate,setMaxRate]=useState("");
  const [results,setResults]=useState<any[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [loading,setLoading]=useState(false);

  async function search(){
    setLoading(true);
    const params=new URLSearchParams();
    if(materialId)params.set("materialId",materialId);
    if(query)params.set("q",query);
    if(quantity)params.set("quantity",quantity);
    if(location)params.set("location",location);
    if(maxRate)params.set("maxRate",maxRate);
    const r=await fetch("/api/smart-finder?"+params.toString());
    const d=await r.json();
    setResults(d.results||[]);
    setSummary(d.summary||null);
    setLoading(false);
  }

  const selected=materials.find((m:any)=>m.id===materialId);
  return <div className="finder">
    <section className="finderSearch">
      <div className="finderTitle"><div><span className="eyebrow">SUPPLY MATCHING ENGINE</span><h2>Find who can supply the material</h2><p>Search known supplier opportunities and available inventory from one screen.</p></div><div className="finderIcon"><Search size={19}/></div></div>
      <div className="finderGrid">
        <label>Material<select value={materialId} onChange={e=>setMaterialId(e.target.value)}><option value="">Any material</option>{materials.map((m:any)=><option key={m.id} value={m.id}>{m.name}{m.grade?" · "+m.grade:""}</option>)}</select></label>
        <label>Material / size search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. HR coil 2mm / E250 / 1250 width"/></label>
        <label>Required quantity<input type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="e.g. 50000"/></label>
        <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Delhi / Faridabad / Bawal"/></label>
        <label>Maximum buy rate<input type="number" value={maxRate} onChange={e=>setMaxRate(e.target.value)} placeholder="Optional ₹/unit"/></label>
        <label>Buyer requirement<select value={buyerId} onChange={e=>setBuyerId(e.target.value)}><option value="">Optional buyer</option>{buyers.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <button className="finderButton" onClick={search} disabled={loading}><Search size={15}/>{loading?"Searching...":"Find Matching Supply"}</button>
    </section>

    {summary&&<section className="finderStats"><div><span>Matches</span><b>{summary.matches}</b></div><div><span>Total available</span><b>{Number(summary.totalAvailable).toLocaleString("en-IN")}</b></div><div><span>Lowest rate</span><b>{summary.lowestRate?"₹"+Number(summary.lowestRate).toLocaleString("en-IN"):"—"}</b></div><div><span>Potential combinations</span><b>{summary.combinations}</b></div></section>}

    <section className="finderResults">
      <div className="finderResultsHead"><div><h3>Matching supply</h3><p>{selected?selected.name:"All known materials"} · ranked by material, quantity, location and price fit</p></div><SlidersHorizontal size={16}/></div>
      {!results.length?<div className="finderEmpty"><Package size={22}/><b>Search the network</b><span>Enter a material, quantity, size or location to see available suppliers.</span></div>:
      <div className="supplyList">{results.map((r:any)=><div className="supplyRow" key={r.id+"-"+r.source}>
        <div className="supplyMain"><div className="supplyMaterial"><b>{r.material}</b><span>{r.grade||r.specification||"Specification not recorded"}</span></div><span className="sourceTag">{r.source}</span></div>
        <div><small>AVAILABLE</small><strong>{Number(r.quantity).toLocaleString("en-IN")} {r.unit}</strong></div>
        <div><small>PRICE</small><strong>{r.rate?"₹"+Number(r.rate).toLocaleString("en-IN"):"—"}</strong></div>
        <div><small>LOCATION</small><strong><MapPin size={12}/>{r.location||"—"}</strong></div>
        <div><small>MATCH</small><strong className="matchScore">{r.matchScore}%</strong></div>
        <button className="supplyAction" title="Use this supply"><ArrowRight size={15}/></button>
      </div>)}</div>}
    </section>
  </div>;
}
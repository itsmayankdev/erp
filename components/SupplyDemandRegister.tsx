"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  mode: "suppliers" | "requirements";
  rows: any[];
};

const money = (v:any) => v == null ? "—" : "₹" + Number(v).toLocaleString("en-IN");
const qty = (v:any,u?:string) => v == null ? "—" : Number(v).toLocaleString("en-IN") + (u ? " " + u : "");

export default function SupplyDemandRegister({mode,rows}:Props){
  const [q,setQ]=useState("");
  const [material,setMaterial]=useState("");
  const [party,setParty]=useState("");
  const [city,setCity]=useState("");
  const [status,setStatus]=useState("");
  const [type,setType]=useState("");
  const [open,setOpen]=useState<string|null>(null);

  const isSupply=mode==="suppliers";
  const materials=useMemo(()=>Array.from(new Set(rows.map(r=>r.material?.name).filter(Boolean))).sort(),[rows]);
  const parties=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.name:r.buyer?.name)).filter(Boolean))).sort(),[rows]);
  const cities=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.city:r.buyer?.city)||r.location).filter(Boolean))).sort(),[rows]);
  const types=useMemo(()=>Array.from(new Set(rows.map(r=>r.sourceType).filter(Boolean))).sort(),[rows]);

  const filtered=useMemo(()=>{
    const needle=q.trim().toLowerCase();
    return rows.filter(r=>{
      const p=isSupply?r.seller:r.buyer;
      const hay=[p?.name,p?.phone,p?.email,p?.city,r.material?.name,r.material?.grade,r.material?.specification,r.location,r.notes,r.sourceType,r.status].join(" ").toLowerCase();
      return (!needle||hay.includes(needle))
        &&(!material||r.material?.name===material)
        &&(!party||p?.name===party)
        &&(!city||((p?.city||r.location)===city))
        &&(!status||r.status===status)
        &&(!type||r.sourceType===type);
    });
  },[rows,q,material,party,city,status,type,isSupply]);

  const clear=()=>{setQ("");setMaterial("");setParty("");setCity("");setStatus("");setType("");};
  const active=[q,material,party,city,status,type].filter(Boolean).length;

  return <section className="registerPanel">
    <div className="registerToolbar">
      <div className="registerSearch"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={isSupply?"Search supplier, material, grade, city, phone...":"Search buyer, material, grade, city, requirement..."}/>{q&&<button onClick={()=>setQ("")}><X size={13}/></button>}</div>
      <div className="filterCount"><SlidersHorizontal size={14}/><b>{filtered.length}</b> of {rows.length}</div>
      {active>0&&<button className="clearFilters" onClick={clear}>Clear filters</button>}
    </div>
    <div className="registerFilters">
      <label>Company / {isSupply?"Supplier":"Buyer"}<select value={party} onChange={e=>setParty(e.target.value)}><option value="">All</option>{parties.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Material<select value={material} onChange={e=>setMaterial(e.target.value)}><option value="">All materials</option>{materials.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>City / Location<select value={city} onChange={e=>setCity(e.target.value)}><option value="">All locations</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{Array.from(new Set(rows.map(r=>r.status).filter(Boolean))).sort().map(x=><option key={x}>{x}</option>)}</select></label>
      {isSupply&&<label>Source type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All source types</option>{types.map(x=><option key={x}>{x}</option>)}</select></label>}
    </div>
    <div className="registerTableWrap"><table className="registerTable"><thead><tr>
      <th>{isSupply?"Supplier":"Buyer"}</th><th>Contact</th><th>Material</th><th>Grade / Specification</th><th>Qty / Weight</th><th>{isSupply?"Buy Rate":"Target Rate"}</th>{isSupply&&<th>Market Rate</th>}<th>{isSupply?"Source Type":"Required By"}</th><th>Location</th><th>Status</th><th></th>
    </tr></thead><tbody>
      {filtered.map((r:any)=>{
        const p=isSupply?r.seller:r.buyer;
        const expanded=open===r.id;
        return <tr key={r.id} className={expanded?"expandedRow":""}>
          <td><b>{p?.name||"—"}</b><small>{p?.category||""}</small></td>
          <td><span>{p?.phone||"—"}</span><small>{p?.email||""}</small></td>
          <td><b>{r.material?.name||"—"}</b><small>{r.material?.unit||r.unit||"KG"}</small></td>
          <td>{r.material?.grade||"—"}<small>{r.material?.specification||r.notes||""}</small></td>
          <td>{qty(r.quantity,r.unit)}</td>
          <td>{money(isSupply?r.askingRate:r.targetRate)}</td>
          {isSupply&&<td>{money(r.estimatedMarketRate)}</td>}
          <td>{isSupply?r.sourceType:(r.requiredBy?new Date(r.requiredBy).toLocaleDateString("en-IN"):"—")}</td>
          <td>{r.location||p?.city||"—"}</td>
          <td><span className="status">{r.status||"Open"}</span></td>
          <td><button className="registerExpand" onClick={()=>setOpen(expanded?null:r.id)} title="View details">{expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button></td>
          {expanded&&<td colSpan={11} className="registerDetails"><div><b>Record details</b><span>Company: {p?.name||"—"}</span><span>Phone: {p?.phone||"—"}</span><span>Email: {p?.email||"—"}</span><span>Material: {r.material?.name||"—"}</span><span>Grade: {r.material?.grade||"—"}</span><span>Specification: {r.material?.specification||"—"}</span><span>Notes: {r.notes||"—"}</span></div></td>}
        </tr>
      })}
      {!filtered.length&&<tr><td colSpan={isSupply?11:10} className="emptyRegister">No matching records. Try clearing a filter or add a new record from Supply & Demand.</td></tr>}
    </tbody></table></div>
  </section>;
}

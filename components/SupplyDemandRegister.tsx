"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Trash2, CheckSquare, Square } from "lucide-react";

type Props = { mode: "suppliers" | "requirements"; rows: any[] };

const money = (v:any) => v == null ? "—" : "₹" + Number(v).toLocaleString("en-IN");
const qty = (v:any,u?:string) => v == null ? "—" : Number(v).toLocaleString("en-IN") + (u ? " " + u : "");

export default function SupplyDemandRegister({mode,rows}:Props){
  const [q,setQ]=useState(""),[material,setMaterial]=useState(""),[party,setParty]=useState(""),[city,setCity]=useState(""),[status,setStatus]=useState(""),[type,setType]=useState("");
  const [open,setOpen]=useState<string|null>(null),[selected,setSelected]=useState<string[]>([]),[deleting,setDeleting]=useState(false);
  const router=useRouter();
  const isSupply=mode==="suppliers";

  const materials=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.material?.name):[r.material?.name]).filter(Boolean))).sort(),[rows,isSupply]);
  const parties=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.name:r.buyer?.name)).filter(Boolean))).sort(),[rows]);
  const cities=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.city:r.buyer?.city)||r.location).filter(Boolean))).sort(),[rows]);
  const types=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.sourceType):[r.sourceType]).filter(Boolean))).sort(),[rows,isSupply]);
  const statuses=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.status):[r.status]).filter(Boolean))).sort(),[rows,isSupply]);

  const filtered=useMemo(()=>{
    const needle=q.trim().toLowerCase();
    return rows.filter(r=>{
      const p=isSupply?r.seller:r.buyer;
      const nested=isSupply?(r.supplies||[]):[r];
      const hay=[p?.name,p?.phone,p?.email,p?.city,r.location,r.notes,...nested.flatMap((s:any)=>[s.material?.name,s.material?.grade,s.material?.specification,s.location,s.notes,s.sourceType,s.status])].join(" ").toLowerCase();
      const matchesMaterial=!material||nested.some((s:any)=>s.material?.name===material);
      const matchesCity=!city||((p?.city||r.location)===city)||nested.some((s:any)=>(s.location||p?.city)===city);
      const matchesStatus=!status||nested.some((s:any)=>s.status===status);
      const matchesType=!type||nested.some((s:any)=>s.sourceType===type);
      return (!needle||hay.includes(needle))&&matchesMaterial&&(!party||p?.name===party)&&matchesCity&&matchesStatus&&matchesType;
    });
  },[rows,q,material,party,city,status,type,isSupply]);

  const clear=()=>{setQ("");setMaterial("");setParty("");setCity("");setStatus("");setType("");setSelected([])};
  const allFilteredSelected=filtered.length>0&&filtered.every(r=>selected.includes(r.id));
  const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll=()=>setSelected(allFilteredSelected?selected.filter(id=>!filtered.some(r=>r.id===id)):[...new Set([...selected,...filtered.map(r=>r.id)])]);

  async function remove(ids:string[]){
    if(!ids.length)return;
    const label=ids.length===1?"this record":ids.length+" selected records";
    if(!confirm("Delete "+label+"? This cannot be undone."))return;
    setDeleting(true);
    try{
      for(const id of ids){
        const module = isSupply ? "sellers" : "buyer-demands";
        const recordId = id;
        const res=await fetch("/api/records?module="+module,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:recordId})});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Unable to delete record");
      }
      setSelected([]);
      setOpen(null);
      router.refresh();
    }catch(e:any){alert(e.message);setDeleting(false)}
  }

  const active=[q,material,party,city,status,type].filter(Boolean).length;

  return <section className="registerPanel">
    <div className="registerToolbar">
      <div className="registerSearch"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={isSupply?"Search supplier, material, grade, city, phone...":"Search buyer, material, grade, city, requirement..."}/>{q&&<button onClick={()=>setQ("")}><X size={13}/></button>}</div>
      <div className="filterCount"><SlidersHorizontal size={14}/><b>{filtered.length}</b> of {rows.length}</div>
      {selected.length>0&&<button className="dangerBtn" onClick={()=>remove(selected)} disabled={deleting}><Trash2 size={13}/> Delete selected ({selected.length})</button>}
      {active>0&&<button className="clearFilters" onClick={clear}>Clear filters</button>}
    </div>
    <div className="registerFilters">
      <label>Company / {isSupply?"Supplier":"Buyer"}<select value={party} onChange={e=>setParty(e.target.value)}><option value="">All</option>{parties.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Material<select value={material} onChange={e=>setMaterial(e.target.value)}><option value="">All materials</option>{materials.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>City / Location<select value={city} onChange={e=>setCity(e.target.value)}><option value="">All locations</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
      {isSupply&&<label>Source type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All source types</option>{types.map(x=><option key={x}>{x}</option>)}</select></label>}
    </div>
    <div className="registerTableWrap"><table className="registerTable"><thead><tr>
      <th className="selectCol"><button className="selectAllBtn" onClick={toggleAll} title="Select all visible">{allFilteredSelected?<CheckSquare size={15}/>:<Square size={15}/>}</button></th>
      <th>{isSupply?"Supplier":"Buyer"}</th><th>Contact</th><th>Material</th><th>Grade / Specification</th><th>Qty / Weight</th><th>{isSupply?"Buy Rate":"Target Rate"}</th>{isSupply&&<th>Market Rate</th>}<th>{isSupply?"Source Type":"Required By"}</th><th>Location</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>
      {filtered.map((r:any)=>{
        const p=isSupply?r.seller:r.buyer; const supplies=isSupply?(r.supplies||[]):[r]; const expanded=open===r.id; const checked=selected.includes(r.id);
        const materialNames=Array.from(new Set(supplies.map((s:any)=>s.material?.name).filter(Boolean)));
        const grades=Array.from(new Set(supplies.map((s:any)=>s.material?.grade).filter(Boolean)));
        const specs=Array.from(new Set(supplies.map((s:any)=>s.material?.specification).filter(Boolean)));
        const totalQty=supplies.reduce((sum:number,s:any)=>sum+(Number(s.quantity)||0),0);
        const rates=Array.from(new Set(supplies.map((s:any)=>s.askingRate).filter((v:any)=>v!=null)));
        const marketRates=Array.from(new Set(supplies.map((s:any)=>s.estimatedMarketRate).filter((v:any)=>v!=null)));
        const sourceTypes=Array.from(new Set(supplies.map((s:any)=>s.sourceType).filter(Boolean)));
        const rowStatuses=Array.from(new Set(supplies.map((s:any)=>s.status).filter(Boolean)));
        return <tr key={r.id} className={expanded?"expandedRow":""}>
          <td><button className="selectAllBtn" onClick={()=>toggle(r.id)}>{checked?<CheckSquare size={15}/>:<Square size={15}/>}</button></td>
          <td><b>{p?.name||"—"}</b><small>{p?.category||""}</small></td>
          <td><span>{p?.phone||"—"}</span><small>{p?.email||""}</small></td>
          <td><b>{materialNames.length?materialNames.join(", "):"No supply recorded"}</b><small>{isSupply?materialNames.length+" material"+(materialNames.length===1?"":"s"):(r.material?.unit||r.unit||"KG")}</small></td>
          <td>{grades.length?grades.join(", "):"—"}<small>{specs.length?specs.join(" · "):"—"}</small></td>
          <td>{totalQty?qty(totalQty,supplies[0]?.unit||r.unit||"KG"):"—"}</td><td>{isSupply?(rates.length===1?money(rates[0]):rates.length?rates.length+" rates":"—"):money(r.targetRate)}</td>
          {isSupply&&<td>{marketRates.length===1?money(marketRates[0]):marketRates.length?marketRates.length+" rates":"—"}</td>}
          <td>{isSupply?(sourceTypes.length===1?sourceTypes[0]:sourceTypes.length?sourceTypes.length+" types":"—"):(r.requiredBy?new Date(r.requiredBy).toLocaleDateString("en-IN"):"—")}</td>
          <td>{p?.city||r.location||"—"}</td><td><span className="status">{rowStatuses.length===1?rowStatuses[0]:rowStatuses.length?rowStatuses.length+" statuses":"No active supply"}</span></td>
          <td><div className="registerActions"><button className="registerExpand" onClick={()=>setOpen(expanded?null:r.id)} title="View details">{expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button><button className="registerDelete" onClick={()=>remove([r.id])} title="Delete record" disabled={deleting}><Trash2 size={14}/></button></div></td>
          {expanded&&<td colSpan={12} className="registerDetails"><div><b>{isSupply?"Supplier details":"Requirement details"}</b><span>Company: {p?.name||"—"}</span><span>Phone: {p?.phone||"—"}</span><span>Email: {p?.email||"—"}</span><span>City: {p?.city||"—"}</span>{isSupply?(supplies.length?<div className="registerSupplyList">{supplies.map((s:any)=><div key={s.id}><b>{s.material?.name||"Unknown material"}</b><span>{qty(s.quantity,s.unit)}</span><span>Buy {money(s.askingRate)}</span><span>Market {money(s.estimatedMarketRate)}</span><span>{s.sourceType||"—"}</span><span>{s.location||"—"}</span><span>{s.status||"—"}</span></div>)}</div>:<span>No supply records yet.</span>):<><span>Material: {r.material?.name||"—"}</span><span>Grade: {r.material?.grade||"—"}</span><span>Specification: {r.material?.specification||"—"}</span><span>Quantity: {qty(r.quantity,r.unit)}</span><span>Target rate: {money(r.targetRate)}</span><span>Notes: {r.notes||"—"}</span></>}</div></td>}
        </tr>
      })}
      {!filtered.length&&<tr><td colSpan={isSupply?12:11} className="emptyRegister">No matching records. Try clearing a filter or add a new record from Supply & Demand.</td></tr>}
    </tbody></table></div>
  </section>;
}
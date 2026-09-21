"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Trash2, CheckSquare, Square, Pencil, Save } from "lucide-react";

type Props = { mode: "suppliers" | "requirements"; rows: any[]; materials?: any[] };

const money = (v:any) => v == null || v === "" ? "—" : "₹" + Number(v).toLocaleString("en-IN");
const qty = (v:any,u?:string) => v == null || v === "" ? "—" : Number(v).toLocaleString("en-IN") + (u ? " " + u : "");

export default function SupplyDemandRegister({mode,rows,materials=[]}:Props){
  const router=useRouter();
  const isSupply=mode==="suppliers";
  const [q,setQ]=useState(""),[material,setMaterial]=useState(""),[party,setParty]=useState(""),[city,setCity]=useState(""),[status,setStatus]=useState(""),[type,setType]=useState("");
  const [open,setOpen]=useState<string|null>(null),[selected,setSelected]=useState<string[]>([]),[deleting,setDeleting]=useState(false);
  const [editing,setEditing]=useState<any|null>(null),[saving,setSaving]=useState(false);

  const materialOptions=useMemo(()=>materials.map((m:any)=>typeof m==="string"?{id:m,name:m}:m).filter((m:any)=>m?.name),[materials]);
  const materialNames=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.material?.name):[r.material?.name]).filter(Boolean))).sort(),[rows,isSupply]);
  const parties=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.name:r.buyer?.name)).filter(Boolean))).sort(),[rows,isSupply]);
  const cities=useMemo(()=>Array.from(new Set(rows.map(r=>(isSupply?r.seller?.city:r.buyer?.city)||r.location).filter(Boolean))).sort(),[rows,isSupply]);
  const types=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.sourceType):[r.sourceType]).filter(Boolean))).sort(),[rows,isSupply]);
  const statuses=useMemo(()=>Array.from(new Set(rows.flatMap(r=>isSupply?(r.supplies||[]).map((s:any)=>s.status):[r.status]).filter(Boolean))).sort(),[rows,isSupply]);

  const filtered=useMemo(()=>{
    const needle=q.trim().toLowerCase();
    return rows.filter(r=>{
      const p=isSupply?r.seller:r.buyer;
      const nested=isSupply?(r.supplies||[]):[r];
      const hay=[p?.name,p?.phone,p?.email,p?.city,r.location,r.notes,...nested.flatMap((s:any)=>[s.material?.name,s.material?.grade,s.material?.specification,s.location,s.notes,s.sourceType,s.status])].join(" ").toLowerCase();
      return (!needle||hay.includes(needle))
        &&(!material||nested.some((s:any)=>s.material?.name===material))
        &&(!party||p?.name===party)
        &&(!city||((p?.city||r.location)===city)||nested.some((s:any)=>(s.location||p?.city)===city))
        &&(!status||nested.some((s:any)=>s.status===status))
        &&(!type||nested.some((s:any)=>s.sourceType===type));
    });
  },[rows,q,material,party,city,status,type,isSupply]);

  const clear=()=>{setQ("");setMaterial("");setParty("");setCity("");setStatus("");setType("");setSelected([])};
  const allFilteredSelected=filtered.length>0&&filtered.every(r=>selected.includes(r.id));
  const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll=()=>setSelected(allFilteredSelected?selected.filter(id=>!filtered.some(r=>r.id===id)):[...new Set([...selected,...filtered.map(r=>r.id)])]);

  async function remove(ids:string[]){
    if(!ids.length)return;
    if(!confirm("Delete "+(ids.length===1?"this record":ids.length+" selected records")+"? This cannot be undone."))return;
    setDeleting(true);
    try{
      for(const id of ids){
        const res=await fetch("/api/records?module="+(isSupply?"sellers":"buyer-demands"),{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Unable to delete record");
      }
      setSelected([]); setOpen(null); setDeleting(false); router.refresh();
    }catch(e:any){alert(e.message);setDeleting(false)}
  }

  function beginEdit(r:any){
    if(isSupply){
      const supply=r.supplies?.[0];
      setEditing({kind:"supplier", sellerId:r.seller.id, supplyId:supply?.id||"", materialId:supply?.materialId||supply?.material?.id||"", name:r.seller.name||"", phone:r.seller.phone||"", email:r.seller.email||"", city:r.seller.city||"", category:r.seller.category||"", material:supply?.material?.name||"", grade:supply?.grade||supply?.material?.grade||"", specification:supply?.specification||supply?.material?.specification||"", quantity:supply?.quantity??"", unit:supply?.unit||supply?.material?.unit||"KG", askingRate:supply?.askingRate??"", marketRate:supply?.estimatedMarketRate??"", sourceType:supply?.sourceType||"Surplus / Dead Stock", location:supply?.location||"", status:supply?.status||"Open", notes:supply?.notes||""});
    }else{
      setEditing({kind:"buyer", demandId:r.id, buyerId:r.buyer?.id||"", materialId:r.materialId||r.material?.id||"", name:r.buyer?.name||"", phone:r.buyer?.phone||"", email:r.buyer?.email||"", city:r.buyer?.city||"", material:r.material?.name||"", grade:r.grade||r.material?.grade||"", specification:r.specification||r.material?.specification||"", quantity:r.quantity??"", unit:r.unit||r.material?.unit||"KG", targetRate:r.targetRate??"", requiredBy:r.requiredBy?new Date(r.requiredBy).toISOString().slice(0,10):"", location:r.location||"", status:r.status||"Open", notes:r.notes||""});
    }
  }

  async function saveEdit(){
    if(!editing)return;
    if(!editing.materialId){ alert("Please select a valid material from the material list."); return; }
    setSaving(true);
    try{
      const patch=async(module:string,body:any)=>{
        const res=await fetch("/api/records?module="+module,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        const data=await res.json(); if(!res.ok)throw new Error(data.error||"Unable to save changes"); return data;
      };
      if(editing.kind==="supplier"){
        await patch("sellers",{id:editing.sellerId,name:editing.name,phone:editing.phone,email:editing.email,city:editing.city,category:editing.category});
        if(editing.supplyId) await patch("opportunities",{id:editing.supplyId,materialId:editing.materialId,grade:editing.grade||null,specification:editing.specification||null,quantity:editing.quantity,unit:editing.unit,askingRate:editing.askingRate,estimatedMarketRate:editing.marketRate,sourceType:editing.sourceType,status:editing.status,location:editing.location,notes:editing.notes});
      }else{
        await patch("buyer-demands",{id:editing.demandId,materialId:editing.materialId,grade:editing.grade||null,specification:editing.specification||null,quantity:editing.quantity,unit:editing.unit,targetRate:editing.targetRate,requiredBy:editing.requiredBy||null,location:editing.location,status:editing.status,notes:editing.notes});
        if(editing.buyerId) await patch("customers-and-buyers",{id:editing.buyerId,name:editing.name,phone:editing.phone,email:editing.email,city:editing.city});
      }
      setEditing(null); router.refresh();
    }catch(e:any){alert(e.message)}finally{setSaving(false)}
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
      <label>Material<select value={material} onChange={e=>setMaterial(e.target.value)}><option value="">All materials</option>{materialOptions.map((x:any)=><option key={x.id||x.name} value={x.name}>{x.name}</option>)}</select></label>
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
        return <Fragment key={r.id}>
          <tr className={expanded?"expandedRow":""}>
            <td><button className="selectAllBtn" onClick={()=>toggle(r.id)}>{checked?<CheckSquare size={15}/>:<Square size={15}/>}</button></td>
            <td><b>{p?.name||"—"}</b><small>{p?.category||""}</small></td>
            <td><span>{p?.phone||"—"}</span><small>{p?.email||""}</small></td>
            <td><b>{materialNames.length?materialNames.join(", "):"No supply recorded"}</b><small>{materialNames.length+" material"+(materialNames.length===1?"":"s")}</small></td>
            <td>{grades.length?grades.join(", "):"—"}<small>{specs.length?specs.join(" · "):"—"}</small></td>
            <td>{totalQty?qty(totalQty,supplies[0]?.unit||r.unit||"KG"):"—"}</td>
            <td>{isSupply?(rates.length===1?money(rates[0]):rates.length?rates.length+" rates":"—"):money(r.targetRate)}</td>
            {isSupply&&<td>{marketRates.length===1?money(marketRates[0]):marketRates.length?marketRates.length+" rates":"—"}</td>}
            <td>{isSupply?(sourceTypes.length===1?sourceTypes[0]:sourceTypes.length?sourceTypes.length+" types":"—"):(r.requiredBy?new Date(r.requiredBy).toLocaleDateString("en-IN"):"—")}</td>
            <td>{p?.city||r.location||"—"}</td><td><span className="status">{rowStatuses.length===1?rowStatuses[0]:rowStatuses.length?rowStatuses.length+" statuses":"No active supply"}</span></td>
            <td><div className="registerActions"><button className="registerEdit" onClick={()=>beginEdit(r)} title="Edit"><Pencil size={14}/></button><button className="registerExpand" onClick={()=>setOpen(expanded?null:r.id)} title="View details">{expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button><button className="registerDelete" onClick={()=>remove([r.id])} title="Delete record" disabled={deleting}><Trash2 size={14}/></button></div></td>
          </tr>
          {expanded&&<tr key={r.id+"-details"}><td colSpan={isSupply?12:11} className="registerDetailsCell"><div className="registerDetailsCard">
            <div className="detailsHeader"><div><span className="detailsEyebrow">{isSupply?"SUPPLIER PROFILE":"BUYER REQUIREMENT"}</span><h3>{p?.name||"—"}</h3></div><button className="detailsEditBtn" onClick={()=>beginEdit(r)}><Pencil size={13}/> Edit</button></div>
            <div className="detailsGrid">
              <div><label>Phone</label><strong>{p?.phone||"—"}</strong></div><div><label>Email</label><strong>{p?.email||"—"}</strong></div><div><label>City</label><strong>{p?.city||r.location||"—"}</strong></div><div><label>Material</label><strong>{materialNames.join(", ")||"—"}</strong></div>
              <div><label>Quantity</label><strong>{qty(totalQty,supplies[0]?.unit||r.unit||"KG")}</strong></div>
              <div><label>{isSupply?"Buy Rate":"Target Rate"}</label><strong>{isSupply?(rates.length===1?money(rates[0]):"Multiple"):money(r.targetRate)}</strong></div>
              {isSupply&&<div><label>Market Rate</label><strong>{marketRates.length===1?money(marketRates[0]):"Multiple"}</strong></div>}
              <div><label>{isSupply?"Source Type":"Required By"}</label><strong>{isSupply?sourceTypes.join(", ")||"—":(r.requiredBy?new Date(r.requiredBy).toLocaleDateString("en-IN"):"—")}</strong></div>
              <div className="detailsWide"><label>Specification</label><strong>{[...grades,...specs].filter(Boolean).join(" · ")||"—"}</strong></div>
              {isSupply&&<div className="detailsWide"><label>Supply Locations / Notes</label><strong>{supplies.map((s:any)=>[s.location,s.notes].filter(Boolean).join(" — ")).filter(Boolean).join(" | ")||"—"}</strong></div>}
              {!isSupply&&<div className="detailsWide"><label>Notes</label><strong>{r.notes||"—"}</strong></div>}
            </div>
          </div></td></tr>}
        </Fragment>;
      })}
      {!filtered.length&&<tr><td colSpan={isSupply?12:11} className="emptyRegister">No matching records. Try clearing a filter or add a new record from Supply & Demand.</td></tr>}
    </tbody></table></div>

    {editing&&<div className="recordModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><div className="recordModal">
      <div className="recordModalHead"><div><span>EDIT RECORD</span><h2>{editing.kind==="supplier"?"Edit Seller / Supply":"Edit Buyer Requirement"}</h2></div><button onClick={()=>setEditing(null)}><X size={18}/></button></div>
      <div className="recordModalBody">
        <div className="editSectionTitle">Company / Contact</div>
        <div className="editGrid">
          <label>Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
          <label>Phone<input value={editing.phone} onChange={e=>setEditing({...editing,phone:e.target.value})}/></label>
          <label>Email<input value={editing.email} onChange={e=>setEditing({...editing,email:e.target.value})}/></label>
          <label>City / Location<input value={editing.city} onChange={e=>setEditing({...editing,city:e.target.value})}/></label>
        </div>
        <div className="editSectionTitle">Material & Commercial Details</div>
        <div className="editGrid">
          <label>Material<input list="edit-material-options" value={editing.material} onChange={e=>{const name=e.target.value; const m=materialOptions.find((x:any)=>x.name===name); setEditing({...editing,material:name,materialId:m?.id||""})}}/><datalist id="edit-material-options">{materialOptions.map((m:any)=><option key={m.id||m.name} value={m.name}>{[m.grade,m.specification].filter(Boolean).join(" · ")}</option>)}</datalist></label>
          <label>Grade<input value={editing.grade} onChange={e=>setEditing({...editing,grade:e.target.value})}/></label>
          <label>Specification<input value={editing.specification} onChange={e=>setEditing({...editing,specification:e.target.value})}/></label>
          <label>Quantity / Weight<input type="number" value={editing.quantity} onChange={e=>setEditing({...editing,quantity:e.target.value})}/></label>
          <label>Unit<input value={editing.unit} onChange={e=>setEditing({...editing,unit:e.target.value})}/></label>
          {editing.kind==="supplier"?<><label>Buy Rate<input type="number" value={editing.askingRate} onChange={e=>setEditing({...editing,askingRate:e.target.value})}/></label><label>Market Rate<input type="number" value={editing.marketRate} onChange={e=>setEditing({...editing,marketRate:e.target.value})}/></label><label>Source Type<select value={editing.sourceType} onChange={e=>setEditing({...editing,sourceType:e.target.value})}><option>Surplus / Dead Stock</option><option>Direct Corporate Purchase</option><option>Regular Supplier Purchase</option><option>Stock / Inventory Purchase</option><option>Other</option></select></label><label>Status<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}><option>Open</option><option>Hot</option><option>Converted</option><option>Closed</option></select></label><label>Supply Location<input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}/></label></>:<><label>Target Rate<input type="number" value={editing.targetRate} onChange={e=>setEditing({...editing,targetRate:e.target.value})}/></label><label>Required By<input type="date" value={editing.requiredBy} onChange={e=>setEditing({...editing,requiredBy:e.target.value})}/></label><label>Status<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}><option>Open</option><option>Urgent</option><option>Matched</option><option>Closed</option></select></label><label>Requirement Location<input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}/></label></>}
        </div>
        {editing.kind!=="supplier"&&<label className="editNotes">Notes<textarea value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label>}
      </div>
      <div className="recordModalFoot"><button className="secondaryBtn" onClick={()=>setEditing(null)}>Cancel</button><button className="primaryBtn" onClick={saveEdit} disabled={saving}><Save size={14}/>{saving?"Saving...":"Save changes"}</button></div>
    </div></div>}
  </section>;
}

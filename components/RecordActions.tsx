"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";

type Props={module:string; row?:any; mode?: "add"|"edit"};

const configs:any={
  "market-intelligence":[["materialId","Material","select","materials"],["source","Source","text"],["location","Location","text"],["rate","Rate","number"],["unit","Unit","text"],["notes","Notes","text"]],
  opportunities:[["sellerId","Seller","select","sellers"],["materialId","Material","select","materials"],["quantity","Quantity","number"],["unit","Unit","text"],["askingRate","Asking Rate","number"],["estimatedMarketRate","Market Rate","number"],["sourceType","Source Type","text"],["status","Status","text"],["location","Location","text"],["notes","Notes","text"]],
  "customers-and-buyers":[["name","Company","text"],["phone","Phone","text"],["email","Email","text"],["city","City","text"],["creditLimit","Credit Limit","number"]],
  warehouses:[["name","Warehouse","text"],["city","City","text"],["capacity","Capacity","number"]],
  "buyer-demands":[["buyerId","Buyer","select","buyers"],["materialId","Material","select","materials"],["quantity","Quantity","number"],["unit","Unit","text"],["targetRate","Target Rate","number"],["requiredBy","Required By","date"],["location","Location","text"],["status","Status","text"],["notes","Notes","text"]],
  sellers:[["name","Supplier","text"],["phone","Phone","text"],["email","Email","text"],["city","City","text"],["category","Category","text"],["reliability","Reliability","text"]],
  materials:[["code","Code","text"],["name","Material","text"],["grade","Grade","text"],["specification","Specification","text"],["unit","Unit","text"]],
  deals:[["sellerId","Seller","select","sellers"],["buyerId","Buyer","select","buyers"],["materialId","Material","select","materials"],["quantity","Quantity","number"],["buyRate","Buy Rate","number"],["sellRate","Sell Rate","number"],["procurementType","Procurement Type","text"],["status","Status","text"]]
};

export default function RecordActions({module,row,mode="add"}:Props){
  const [open,setOpen]=useState(false);
  const [master,setMaster]=useState<any>({});
  const [form,setForm]=useState<any>({});
  const [newMaster,setNewMaster]=useState<any>({name:"",phone:"",email:"",city:"",grade:"",specification:"",unit:"KG"});
  const [addingMaster,setAddingMaster]=useState<"seller"|"buyer"|"material"|null>(null);
  const fields=configs[module]||[];
  useEffect(()=>{if(open) fetch("/api/records?module=master-data").then(r=>r.json()).then(setMaster)},[open]);
  useEffect(()=>{if(open) setForm(row?{...row}:{});},[open,row]);
  const createMaster=async(kind:"seller"|"buyer"|"material")=>{ if(!newMaster.name.trim()) return alert("Enter a name."); const module=kind==="seller"?"sellers":kind==="buyer"?"customers-and-buyers":"materials"; const body=kind==="material"?{name:newMaster.name,grade:newMaster.grade,specification:newMaster.specification,unit:newMaster.unit||"KG"}:{name:newMaster.name,phone:newMaster.phone,email:newMaster.email,city:newMaster.city}; const r=await fetch("/api/records?module="+module,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); if(!r.ok){alert((await r.json()).error||"Unable to create");return;} const x=await r.json(); const list=kind==="seller"?"sellers":kind==="buyer"?"buyers":"materials"; const key=kind==="seller"?"sellerId":kind==="buyer"?"buyerId":"materialId"; setMaster((m:any)=>({...m,[list]:[...(m[list]||[]),x]})); setForm((v:any)=>({...v,[key]:x.id})); setAddingMaster(null); setNewMaster({name:"",phone:"",email:"",city:"",grade:"",specification:"",unit:"KG"}); };\n  const submit=async()=>{
    const payload:any={...form};
    for(const key of ["seller","buyer","material","warehouse","opportunity","demand","agreements","purchases","salesOrders","stocks","company"]) delete payload[key];
    if(payload.id===undefined && row?.id) payload.id=row.id;
    let url="/api/records?module="+module;
    if(module==="deals"){payload.companyId=master.companyId;url="/api/deals";}
    const res=await fetch(url,{method:mode==="edit"?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(!res.ok){alert((await res.json()).error||"Unable to save record");return;}
    window.location.reload();
  };
  const trigger=mode==="edit"
    ? <button className="rowEdit" onClick={()=>setOpen(true)} title="Edit"><Pencil size={14}/></button>
    : <button className="moduleAdd" onClick={()=>setOpen(true)}><Plus size={15}/> New {module==="customers-and-buyers"?"Buyer":module.replaceAll("-"," ")}</button>;
  return <>{trigger}{open&&<div className="modalBackdrop"><div className="recordModal">
    <div className="modalHead"><div><span className="eyebrow">{mode==="edit"?"EDIT RECORD":"NEW RECORD"}</span><h2>{mode==="edit"?"Update":"Create"} {module.replaceAll("-"," ")}</h2></div><button className="modalClose" onClick={()=>setOpen(false)}><X size={18}/></button></div>
    <div className="formGrid">{fields.map(([key,label,type,source]:any)=><label key={key}>{label}{type==="select"?<><select value={form[key]??""} onChange={e=>{const v=e.target.value;if(v==="__new__"){setAddingMaster(source==="sellers"?"seller":source==="buyers"?"buyer":"material");setForm({...form,[key]:""});}else setForm({...form,[key]:v})}}><option value="">Select...</option>{(master[source]||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new__">＋ Add new {source==="sellers"?"company":source==="buyers"?"buyer":"material"}</option></select>{addingMaster===(source==="sellers"?"seller":source==="buyers"?"buyer":"material")&&<div className="masterInline"><input placeholder={source==="materials"?"Material name":"Company name"} value={newMaster.name} onChange={e=>setNewMaster({...newMaster,name:e.target.value})}/><input placeholder="City" value={newMaster.city} onChange={e=>setNewMaster({...newMaster,city:e.target.value})}/>{source==="materials"&&<><input placeholder="Grade" value={newMaster.grade} onChange={e=>setNewMaster({...newMaster,grade:e.target.value})}/><input placeholder="Specification" value={newMaster.specification} onChange={e=>setNewMaster({...newMaster,specification:e.target.value})}/></>}<button type="button" onClick={()=>createMaster(addingMaster)}>Save new</button></div>}</>:<input type={type} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}</div>
    <div className="modalFoot"><button className="secondaryBtn" onClick={()=>setOpen(false)}>Cancel</button><button className="saveBtn" onClick={submit}>{mode==="edit"?"Save Changes":"Create Record"}</button></div>
  </div></div>}</>;
}
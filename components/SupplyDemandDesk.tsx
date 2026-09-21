"use client";
import { useMemo,useState } from "react";
import { Plus, UserPlus, Search, CheckCircle2 } from "lucide-react";

export default function SupplyDemandDesk({initialSellers,initialBuyers,initialMaterials}:any){
 const [tab,setTab]=useState<"supply"|"demand">("supply");
 const [sellers,setSellers]=useState(initialSellers),[buyers,setBuyers]=useState(initialBuyers),[materials,setMaterials]=useState(initialMaterials);
 const [sellerId,setSellerId]=useState(""),[buyerId,setBuyerId]=useState(""),[materialId,setMaterialId]=useState("");
 const [newParty,setNewParty]=useState(false),[partyName,setPartyName]=useState(""),[partyPhone,setPartyPhone]=useState(""),[partyEmail,setPartyEmail]=useState(""),[partyCity,setPartyCity]=useState("");
 const [newPartyMode,setNewPartyMode]=useState(false);
 const [newMaterial,setNewMaterial]=useState(false),[materialName,setMaterialName]=useState(""),[materialGrade,setMaterialGrade]=useState(""),[materialSpec,setMaterialSpec]=useState(""),[materialUnit,setMaterialUnit]=useState("KG");
 const [form,setForm]=useState<any>({quantity:"",unit:"KG",askingRate:"",marketRate:"",sourceType:"Surplus / Dead Stock",status:"Open",location:"",notes:"",targetRate:"",requiredBy:""});
 const [saving,setSaving]=useState(false),[saved,setSaved]=useState("");

 const selectedSeller=sellers.find((x:any)=>x.id===sellerId),selectedBuyer=buyers.find((x:any)=>x.id===buyerId),selectedMaterial=materials.find((x:any)=>x.id===materialId);
 const partyList=tab==="supply"?sellers:buyers;

 function chooseParty(id:string){
  if(tab==="supply"){setSellerId(id);const x=sellers.find((a:any)=>a.id===id);if(x)setForm((f:any)=>({...f,location:f.location||x.city||""}));}
  else setBuyerId(id);
 }
 function chooseMaterial(id:string){setMaterialId(id);setNewMaterial(false);const x=materials.find((a:any)=>a.id===id);if(x)setForm((f:any)=>({...f,unit:x.unit||"KG"}));}
 function startNewMaterial(){setNewMaterial(true);setMaterialId("");setMaterialName("");setMaterialGrade("");setMaterialSpec("");setMaterialUnit("KG");setForm((f:any)=>({...f,unit:"KG"}));}
 async function addMaterial(){
  if(!materialName.trim())return;
  const r=await fetch("/api/records?module=materials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:materialName,grade:materialGrade,specification:materialSpec,unit:materialUnit||"KG"})});
  if(!r.ok){alert((await r.json()).error||"Unable to create material");return;}
  const x=await r.json();
  setMaterials((a:any[])=>[...a,x]); setMaterialId(x.id); setForm((f:any)=>({...f,unit:x.unit||"KG"}));
  setNewMaterial(false);setMaterialName("");setMaterialGrade("");setMaterialSpec("");setMaterialUnit("KG");
 }

 async function addParty(){
  if(!partyName.trim())return;
  const module=tab==="supply"?"sellers":"customers-and-buyers";
  const body={name:partyName,phone:partyPhone,email:partyEmail,city:partyCity,category:tab==="supply"?"Trading / Source":undefined};
  const r=await fetch("/api/records?module="+module,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){alert((await r.json()).error||"Unable to create company");return;}
  const x=await r.json();
  if(tab==="supply"){setSellers((a:any[])=>[...a,x]);setSellerId(x.id);}else{setBuyers((a:any[])=>[...a,x]);setBuyerId(x.id);}
  setNewParty(false);setNewPartyMode(false);setPartyName("");setPartyPhone("");setPartyEmail("");setPartyCity("");
 }
 async function save(){
  if(!materialId||(!sellerId&&tab==="supply")||(!buyerId&&tab==="demand")||!form.quantity)return alert("Please select the company, material and quantity.");
  setSaving(true);
  const body=tab==="supply"
   ?{sellerId,materialId,quantity:Number(form.quantity),unit:form.unit||selectedMaterial?.unit||"KG",askingRate:form.askingRate?Number(form.askingRate):null,estimatedMarketRate:form.marketRate?Number(form.marketRate):null,sourceType:form.sourceType,status:form.status,location:form.location,notes:form.notes}
   :{buyerId,materialId,quantity:Number(form.quantity),unit:form.unit||selectedMaterial?.unit||"KG",targetRate:form.targetRate?Number(form.targetRate):null,requiredBy:form.requiredBy||null,location:form.location,status:form.status,notes:form.notes};
  const r=await fetch("/api/records?module="+(tab==="supply"?"opportunities":"buyer-demands"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){alert((await r.json()).error||"Unable to save");setSaving(false);return;}
  setSaved(tab==="supply"?"Supply record saved":"Buyer requirement saved");setSaving(false);setTimeout(()=>location.reload(),700);
 }
 return <div className="sdDesk">
  <div className="sdTabs"><button className={tab==="supply"?"active":""} onClick={()=>setTab("supply")}><span>01</span> Supply / Source</button><button className={tab==="demand"?"active":""} onClick={()=>setTab("demand")}><span>02</span> Buyer Requirement</button></div>
  <section className="sdPanel">
   <div className="sdHead"><div><span className="eyebrow">{tab==="supply"?"SUPPLY REGISTER":"DEMAND REGISTER"}</span><h2>{tab==="supply"?"Record material available from any source":"Record exactly what a buyer is looking for"}</h2><p>{tab==="supply"?"Factory surplus, dead stock, direct company purchase, trader source or any other known supply.":"Store buyer, material, specification, quantity, target rate and requirement details so they can be matched later."}</p></div><div className="sdCount"><b>{tab==="supply"?sellers.length:buyers.length}</b><small>{tab==="supply"?"known sources":"known buyers"}</small></div></div>
   <div className="sdForm">
    <div className="sdSection"><div className="sdSectionTitle"><b>{tab==="supply"?"Source / Company":"Buyer / Company"}</b><span>Select an existing company or choose Add new company in the same field.</span></div>
      <div className="sdGrid">
       <label>{tab==="supply"?"Company / source":"Buyer / company"}{newPartyMode?<input autoFocus value={partyName} onChange={e=>setPartyName(e.target.value)} placeholder="Type new company name..."/>:<select value={tab==="supply"?sellerId:buyerId} onChange={e=>{const v=e.target.value;if(v==="__new__"){setNewPartyMode(true);setNewParty(true);if(tab==="supply")setSellerId("");else setBuyerId("");}else chooseParty(v)}}><option value="">Select existing company...</option>{partyList.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new__">＋ Add new company</option></select>}</label>
       <label>Phone<input value={newPartyMode?partyPhone:((tab==="supply"?selectedSeller?.phone:selectedBuyer?.phone)||"")} onChange={e=>newPartyMode&&setPartyPhone(e.target.value)} readOnly={!newPartyMode} placeholder={newPartyMode?"Phone":"Auto-filled from company"}/></label>
       <label>Email<input value={newPartyMode?partyEmail:((tab==="supply"?selectedSeller?.email:selectedBuyer?.email)||"")} onChange={e=>newPartyMode&&setPartyEmail(e.target.value)} readOnly={!newPartyMode} placeholder={newPartyMode?"Email":"Auto-filled from company"}/></label>
       <label>City / location<input value={newPartyMode?partyCity:((tab==="supply"?selectedSeller?.city:selectedBuyer?.city)||"")} onChange={e=>newPartyMode&&setPartyCity(e.target.value)} readOnly={!newPartyMode} placeholder={newPartyMode?"City":"Auto-filled from company"}/></label>
      </div>
      {newPartyMode&&<div className="inlineActions"><button onClick={()=>{setNewPartyMode(false);setNewParty(false);setPartyName("");setPartyPhone("");setPartyEmail("");setPartyCity("");}}>Cancel</button><button className="saveBtn" onClick={addParty}><Plus size={13}/> Save company</button></div>}
    </div>
    <div className="sdSection"><div className="sdSectionTitle"><b>Material details</b><span>Existing master data auto-fills the known specification.</span></div>
      <div className="sdGrid">
       <label>Material{newMaterial?<input autoFocus value={materialName} onChange={e=>setMaterialName(e.target.value)} placeholder="Type new material name..."/>:<select value={materialId} onChange={e=>{const v=e.target.value;if(v==="__new__"){startNewMaterial();}else chooseMaterial(v)}}><option value="">Select material...</option>{materials.map((x:any)=><option key={x.id} value={x.id}>{x.name}{x.grade?" · "+x.grade:""}</option>)}<option value="__new__">＋ Add new material</option></select>}</label>
       <label>Grade<input value={newMaterial?materialGrade:(selectedMaterial?.grade||"")} readOnly={!newMaterial} onChange={e=>newMaterial&&setMaterialGrade(e.target.value)} placeholder={newMaterial?"e.g. IS 513":"Auto-filled"}/></label>
       <label>Specification<input value={newMaterial?materialSpec:(selectedMaterial?.specification||"")} readOnly={!newMaterial} onChange={e=>newMaterial&&setMaterialSpec(e.target.value)} placeholder={newMaterial?"e.g. 0.8mm x 1250mm":"Auto-filled"}/></label>
       <label>Unit<input value={form.unit||""} onChange={e=>setForm({...form,unit:e.target.value})}/></label>
      </div>
      {newMaterial&&<div className="inlineActions materialActions"><button onClick={()=>setNewMaterial(false)}>Cancel</button><button className="saveBtn" onClick={addMaterial} disabled={!materialName.trim()}><Plus size={13}/> Save material</button></div>}
    </div>
    <div className="sdSection"><div className="sdSectionTitle"><b>{tab==="supply"?"Availability & commercial details":"Requirement & commercial details"}</b></div>
      <div className="sdGrid">
       <label>Quantity / weight<input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="e.g. 50000"/></label>
       {tab==="supply"?<><label>Asking / buy rate<input type="number" value={form.askingRate} onChange={e=>setForm({...form,askingRate:e.target.value})} placeholder="₹ per unit"/></label><label>Current market rate<input type="number" value={form.marketRate} onChange={e=>setForm({...form,marketRate:e.target.value})} placeholder="₹ per unit"/></label><label>Source type<select value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value})}><option>Surplus / Dead Stock</option><option>Direct Corporate Purchase</option><option>Regular Supplier Purchase</option><option>Stock / Inventory Purchase</option><option>Trader / Market Source</option><option>Other</option></select></label></>:<><label>Target buying rate<input type="number" value={form.targetRate} onChange={e=>setForm({...form,targetRate:e.target.value})} placeholder="₹ per unit"/></label><label>Required by<input type="date" value={form.requiredBy} onChange={e=>setForm({...form,requiredBy:e.target.value})}/></label><label>Requirement status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Open</option><option>Urgent</option><option>Planned</option><option>On Hold</option><option>Closed</option></select></label></>}
       <label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Factory / delivery location"/></label>
       <label className="wide">Notes / size / thickness / width / length<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Store any commercial or specification detail here"/></label>
      </div>
    </div>
    <div className="sdFooter">{saved?<span className="saved"><CheckCircle2 size={14}/>{saved}</span>:<span>All saved company and material details become reusable master data.</span>}<button className="saveBtn" onClick={save} disabled={saving}>{saving?"Saving...":tab==="supply"?"Save Supply Record":"Save Buyer Requirement"}</button></div>
   </div>
  </section>
 </div>
}
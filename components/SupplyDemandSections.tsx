"use client";

import { useState } from "react";
import SupplyDemandRegister from "@/components/SupplyDemandRegister";

export default function SupplyDemandSections({desk,sellerRows,buyerRows,sellerCount,buyerCount}:any){
 const [tab,setTab]=useState<"entry"|"sellers"|"buyers">("entry");
 return <div>
  <div className="sdTopTabs">
   <button className={tab==="entry"?"active":""} onClick={()=>setTab("entry")}><span>01</span> Supply & Buyer Entry</button>
   <button className={tab==="sellers"?"active":""} onClick={()=>setTab("sellers")}><span>02</span> Sellers Data <b>{sellerCount}</b></button>
   <button className={tab==="buyers"?"active":""} onClick={()=>setTab("buyers")}><span>03</span> Buyers Data <b>{buyerCount}</b></button>
  </div>
  {tab==="entry"&&desk}
  {tab==="sellers"&&<SupplyDemandRegister mode="suppliers" rows={sellerRows}/>}
  {tab==="buyers"&&<SupplyDemandRegister mode="requirements" rows={buyerRows}/>}
 </div>;
}
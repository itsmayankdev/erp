import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SupplyDemandRegister from "@/components/SupplyDemandRegister";

export const dynamic="force-dynamic";

export default async function SuppliersPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;
 const suppliers=await prisma.seller.findMany({
  where:{companyId:company.id},
  include:{opportunities:{include:{material:true},orderBy:{updatedAt:"desc"}}},
  orderBy:{name:"asc"}
 });
 const rows=suppliers.flatMap((seller:any)=>{
  if(!seller.opportunities.length) return [{id:"supplier-"+seller.id,seller,material:null,quantity:null,unit:"KG",askingRate:null,estimatedMarketRate:null,sourceType:null,location:seller.city,status:"No active supply record",notes:null}];
  return seller.opportunities.map((o:any)=>({...o,seller}));
 });
 const safe=JSON.parse(JSON.stringify(rows));
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">SUPPLY REGISTER</p><h1>Suppliers & Available Stock</h1><p className="muted">{company.name} · {suppliers.length} suppliers · {rows.filter((r:any)=>r.material).length} material availability records</p></div><Link className="secondaryBtn" href="/supply-demand">+ New supply record</Link></header>
  <SupplyDemandRegister mode="suppliers" rows={safe}/>
 </main>;
}

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SupplyDemandRegister from "@/components/SupplyDemandRegister";

export const dynamic="force-dynamic";

export default async function SuppliersPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;
 const rows=await prisma.opportunity.findMany({
  where:{companyId:company.id},
  include:{seller:true,material:true},
  orderBy:{updatedAt:"desc"}
 });
 const safe=JSON.parse(JSON.stringify(rows));
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">SUPPLY REGISTER</p><h1>Suppliers & Available Stock</h1><p className="muted">{company.name} · {rows.length} supply records across {new Set(rows.map(r=>r.sellerId)).size} suppliers</p></div><Link className="secondaryBtn" href="/supply-demand">+ New supply record</Link></header>
  <SupplyDemandRegister mode="suppliers" rows={safe}/>
 </main>;
}

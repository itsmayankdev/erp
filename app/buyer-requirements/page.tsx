import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SupplyDemandRegister from "@/components/SupplyDemandRegister";

export const dynamic="force-dynamic";

export default async function BuyerRequirementsPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;
 const rows=await prisma.buyerDemand.findMany({
  where:{companyId:company.id},
  include:{buyer:true,material:true},
  orderBy:{updatedAt:"desc"}
 });
 const safe=JSON.parse(JSON.stringify(rows));
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">DEMAND REGISTER</p><h1>Buyer Requirements</h1><p className="muted">{company.name} · {rows.length} active and historical requirements</p></div><Link className="secondaryBtn" href="/supply-demand">+ New buyer requirement</Link></header>
  <SupplyDemandRegister mode="requirements" rows={safe}/>
 </main>;
}

import { prisma } from "@/lib/prisma";
import SupplyDemandDesk from "@/components/SupplyDemandDesk";

export const dynamic="force-dynamic";

export default async function SupplyDemandPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found. Run the seed first.</p></main>;
 const [sellers,buyers,materials]=await Promise.all([
  prisma.seller.findMany({where:{companyId:company.id},select:{id:true,name:true,phone:true,email:true,city:true,category:true,reliability:true},orderBy:{name:"asc"}}),
  prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true,phone:true,email:true,city:true,creditLimit:true},orderBy:{name:"asc"}}),
  prisma.material.findMany({where:{companyId:company.id,active:true},select:{id:true,name:true,grade:true,specification:true,unit:true},orderBy:{name:"asc"}})
 ]);
 const safe=(x:any)=>JSON.parse(JSON.stringify(x));
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">TRADING CONTROL DESK</p><h1>Supply & Demand</h1><p className="muted">{company.name} · one centralized entry point for what we can buy and what our buyers need.</p></div></header>
  <SupplyDemandDesk initialSellers={safe(sellers)} initialBuyers={safe(buyers)} initialMaterials={safe(materials)}/>
 </main>;
}
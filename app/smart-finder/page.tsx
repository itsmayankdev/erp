import { prisma } from "@/lib/prisma";
import SmartMaterialFinder from "@/components/SmartMaterialFinder";
export const dynamic = "force-dynamic";
export default async function SmartFinderPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found. Run the seed first.</p></main>;
 const [materials,buyers,demands]=await Promise.all([
  prisma.material.findMany({where:{companyId:company.id,active:true},select:{id:true,name:true,grade:true,specification:true,unit:true},orderBy:{name:"asc"}}),
  prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true},orderBy:{name:"asc"}}),
  prisma.buyerDemand.findMany({where:{companyId:company.id,status:{notIn:["Closed","Matched","Fulfilled","Cancelled"]}},include:{buyer:true,material:true},orderBy:{updatedAt:"desc"}})
 ]);
 const safe=(x:any)=>JSON.parse(JSON.stringify(x));
 return <main className="modulePage"><header className="moduleHeader"><div><p className="eyebrow">TRADING DESK</p><h1>Smart Material Finder</h1><p className="muted">Turn a buyer requirement into a ranked list of known supply — then move a suitable match directly toward a deal.</p></div></header><SmartMaterialFinder materials={safe(materials)} buyers={safe(buyers)} demands={safe(demands)}/></main>;
}
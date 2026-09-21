import { prisma } from "@/lib/prisma";
import SupplyDemandDesk from "@/components/SupplyDemandDesk";
import SupplyDemandSections from "@/components/SupplyDemandSections";

export const dynamic="force-dynamic";

export default async function SupplyDemandPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found. Run the seed first.</p></main>;
 const [sellers,buyers,materials,opportunities,demands]=await Promise.all([
  prisma.seller.findMany({where:{companyId:company.id},select:{id:true,name:true,phone:true,email:true,city:true,category:true,reliability:true},orderBy:{name:"asc"}}),
  prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true,phone:true,email:true,city:true,creditLimit:true},orderBy:{name:"asc"}}),
  prisma.material.findMany({where:{companyId:company.id,active:true},select:{id:true,name:true,grade:true,specification:true,unit:true},orderBy:{name:"asc"}}),
  prisma.opportunity.findMany({where:{companyId:company.id},include:{seller:true,material:true},orderBy:{updatedAt:"desc"}}),
  prisma.buyerDemand.findMany({where:{companyId:company.id},include:{buyer:true,material:true},orderBy:{updatedAt:"desc"}})
 ]);
 const safe=(x:any)=>JSON.parse(JSON.stringify(x));
 const sellerRows=sellers.flatMap((seller:any)=>{
  const own=opportunities.filter((o:any)=>o.sellerId===seller.id);
  return own.length?own.map((o:any)=>({...o,seller})): [{id:"seller-"+seller.id,seller,material:null,quantity:null,unit:"KG",askingRate:null,estimatedMarketRate:null,sourceType:null,location:seller.city,status:"No active supply record",notes:null}];
 });
 return <main className="modulePage">
  <header className="moduleHeader"><div><p className="eyebrow">TRADING CONTROL DESK</p><h1>Supply & Demand</h1><p className="muted">{company.name} · one centralized entry point for supply, sellers and buyer requirements.</p></div></header>
  <SupplyDemandSections
   desk={<SupplyDemandDesk initialSellers={safe(sellers)} initialBuyers={safe(buyers)} initialMaterials={safe(materials)}/>}
   sellerRows={safe(sellerRows)}
   buyerRows={safe(demands)}
   sellerCount={sellerRows.length}
   buyerCount={demands.length}
  />
 </main>;
}
import { prisma } from "@/lib/prisma";
import TradeHistoryClient from "@/components/TradeHistoryClient";

export const dynamic="force-dynamic";

export default async function TradeHistoryPage(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return <main className="modulePage"><p>No company found.</p></main>;

 const [sellers,buyers,deals]=await Promise.all([
  prisma.seller.findMany({where:{companyId:company.id},select:{id:true,name:true}}),
  prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true}}),
  prisma.deal.findMany({
   where:{companyId:company.id},
   orderBy:{createdAt:"desc"},
   include:{
    seller:true,buyer:true,material:true,dealSources:{include:{seller:true}},
    purchases:{include:{payments:true}},
    salesOrders:{include:{payments:true}}
   }
  })
 ]);

 const counterpartiesMap=new Map<string,{id:string,name:string,roles:string[]}>();
 sellers.forEach(s=>counterpartiesMap.set(s.id,{id:s.id,name:s.name,roles:["Seller"]}));
 buyers.forEach(b=>{
   const existing=counterpartiesMap.get(b.id);
   if(existing) existing.roles.push("Buyer");
   else counterpartiesMap.set(b.id,{id:b.id,name:b.name,roles:["Buyer"]});
 });

 const n=(v:any)=>Number(v||0);
 const rows:any[]=[];
 for(const d of deals){
   const purchaseValue=d.purchases.length
     ? d.purchases.reduce((x:any,p:any)=>x+n(p.quantity)*n(p.rate),0)
     : n(d.quantity)*n(d.buyRate);
   const salesValue=d.salesOrders.length
     ? d.salesOrders.reduce((x:any,s:any)=>x+n(s.quantity)*n(s.rate),0)
     : n(d.sellRate)*n(d.quantity);
   const purchasePayments=d.purchases.flatMap((p:any)=>p.payments||[]);
   const salesPayments=d.salesOrders.flatMap((s:any)=>s.payments||[]);
   const paidPurchasePayment=purchasePayments.reduce((x:number,p:any)=>x+n(p.amount),0);
   const receivedSalesPayment=salesPayments.reduce((x:number,p:any)=>x+n(p.amount),0);
   const profit=d.actualProfit!=null?n(d.actualProfit):d.expectedProfit!=null?n(d.expectedProfit):salesValue-purchaseValue-n(d.freightCost)-n(d.loadingCost)-n(d.otherCost);

   if(d.seller) rows.push({
     id:d.id,counterpartyId:d.seller.id,counterpartyName:d.seller.name,role:"seller",material:d.material,
     quantity:n(d.quantity),buyRate:n(d.buyRate),sellRate:n(d.sellRate),purchaseValue,salesValue,profit,
     freight:n(d.freightCost)+n(d.loadingCost)+n(d.otherCost),paid:paidPurchasePayment,paidPurchasePayment,receivedSalesPayment,
     status:d.status,procurementType:d.procurementType,createdAt:d.createdAt,
     details:{sources:d.dealSources.map((s:any)=>({seller:s.seller?.name||"Internal",quantity:n(s.quantity),buyRate:n(s.buyRate),location:s.location||"—"})),purchases:d.purchases.map((p:any)=>({reference:p.reference,quantity:n(p.quantity),rate:n(p.rate),status:p.status,receivedAt:p.receivedAt,payments:(p.payments||[]).map((x:any)=>n(x.amount))})),sales:d.salesOrders.map((s:any)=>({reference:s.reference,quantity:n(s.quantity),rate:n(s.rate),status:s.status,dispatchDate:s.dispatchDate,payments:(s.payments||[]).map((x:any)=>n(x.amount))}))}
   });
   if(d.buyer) rows.push({
     id:d.id,counterpartyId:d.buyer.id,counterpartyName:d.buyer.name,role:"buyer",material:d.material,
     quantity:n(d.quantity),buyRate:n(d.buyRate),sellRate:n(d.sellRate),purchaseValue,salesValue,profit,
     freight:n(d.freightCost)+n(d.loadingCost)+n(d.otherCost),paid:receivedSalesPayment,paidPurchasePayment,receivedSalesPayment,
     status:d.status,procurementType:d.procurementType,createdAt:d.createdAt,
     details:{sources:d.dealSources.map((s:any)=>({seller:s.seller?.name||"Internal",quantity:n(s.quantity),buyRate:n(s.buyRate),location:s.location||"—"})),purchases:d.purchases.map((p:any)=>({reference:p.reference,quantity:n(p.quantity),rate:n(p.rate),status:p.status,receivedAt:p.receivedAt,payments:(p.payments||[]).map((x:any)=>n(x.amount))})),sales:d.salesOrders.map((s:any)=>({reference:s.reference,quantity:n(s.quantity),rate:n(s.rate),status:s.status,dispatchDate:s.dispatchDate,payments:(s.payments||[]).map((x:any)=>n(x.amount))}))}
   });
 }

 const safe=(x:any)=>JSON.parse(JSON.stringify(x));
 return <TradeHistoryClient companyName={company.name} counterparties={safe(Array.from(counterpartiesMap.values()).sort((a,b)=>a.name.localeCompare(b.name)))} deals={safe(rows)}/>;
}
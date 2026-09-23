import { prisma } from "@/lib/prisma";
import PaymentsClient from "@/components/PaymentsClient";

export const dynamic="force-dynamic";

export default async function PaymentsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;

  const [rows,purchases,salesOrders]=await Promise.all([
    prisma.payment.findMany({where:{companyId:company.id},include:{buyer:true,purchase:{include:{seller:true}},salesOrder:{include:{buyer:true}}},orderBy:{createdAt:"desc"}}),
    prisma.purchase.findMany({where:{companyId:company.id},include:{seller:true},orderBy:{createdAt:"desc"}}),
    prisma.salesOrder.findMany({where:{companyId:company.id},include:{buyer:true},orderBy:{createdAt:"desc"}})
  ]);

  const paymentsByPurchase=new Map<string,number>();
  const paymentsBySales=new Map<string,number>();
  rows.forEach((r:any)=>{
    if(r.status==="Cancelled") return;
    if(r.purchaseId) paymentsByPurchase.set(r.purchaseId,(paymentsByPurchase.get(r.purchaseId)||0)+Number(r.amount||0));
    if(r.salesOrderId) paymentsBySales.set(r.salesOrderId,(paymentsBySales.get(r.salesOrderId)||0)+Number(r.amount||0));
  });
  const documents=[
    ...purchases.map(p=>{
      const total=Number(p.quantity)*Number(p.rate)+Number(p.freightCost)+Number(p.loadingCost)+Number(p.otherCost);
      const paid=paymentsByPurchase.get(p.id)||0;
      return {id:p.id,kind:"purchase",reference:p.reference,party:p.seller.name,total,paid,outstanding:Math.max(0,total-paid)};
    }),
    ...salesOrders.map(s=>{
      const total=Number(s.quantity)*Number(s.rate);
      const paid=paymentsBySales.get(s.id)||0;
      return {id:s.id,kind:"salesOrder",reference:s.reference,party:s.buyer.name,total,paid,outstanding:Math.max(0,total-paid),buyerId:s.buyerId};
    })
  ];

  const safe=(x:any)=>JSON.parse(JSON.stringify(x));
  return <main className="modulePage">
    <header className="moduleHeader"><div><p className="eyebrow">FINANCE</p><h1>Payments</h1><p className="muted">Central payment register linked to purchases, sales and counterparties.</p></div></header>
    <PaymentsClient companyId={company.id} initialRows={safe(rows)} documents={safe(documents)}/>
  </main>;
}
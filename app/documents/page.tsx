import { prisma } from "@/lib/prisma";
import DocumentCenter from "@/components/DocumentCenter";

function serialize<T>(value:T):T {
  return JSON.parse(JSON.stringify(value));
}

export default async function DocumentsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main style={{padding:40}}>Company not initialized.</main>;
  const [purchases,salesOrders,deals,documents]=await Promise.all([
    prisma.purchase.findMany({where:{companyId:company.id},include:{seller:true,material:true},orderBy:{createdAt:"desc"},take:50}),
    prisma.salesOrder.findMany({where:{companyId:company.id},include:{buyer:true,material:true},orderBy:{createdAt:"desc"},take:50}),
    prisma.deal.findMany({where:{companyId:company.id},include:{buyer:true,material:true},orderBy:{createdAt:"desc"},take:50}),
    prisma.document.findMany({where:{companyId:company.id},orderBy:{createdAt:"desc"},take:30})
  ]);

  // Prisma Decimal/Date values cannot cross the Server -> Client Component boundary.
  // Convert the complete query result to JSON-safe values before passing it to DocumentCenter.
  return <DocumentCenter
    company={serialize(company)}
    purchases={serialize(purchases)}
    salesOrders={serialize(salesOrders)}
    deals={serialize(deals)}
    documents={serialize(documents)}
  />;
}

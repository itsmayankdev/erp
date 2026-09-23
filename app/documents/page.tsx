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
    prisma.deal.findMany({where:{companyId:company.id},include:{buyer:true,seller:true,material:true},orderBy:{createdAt:"asc"},take:50}),
    prisma.document.findMany({where:{companyId:company.id},orderBy:{createdAt:"desc"},take:30})
  ]);

  const dealNumbers=new Map<string,string>();
  const dealCounts=new Map<string,number>();
  const short=(name:string)=>{const s=(name||"UNM").replace(/[^a-zA-Z0-9]/g,"").toUpperCase();return s.slice(0,3)||"UNM"};
  for(const d of deals){const key=d.sellerId+"|"+(d.buyerId||"UNMATCHED");const n=(dealCounts.get(key)||0)+1;dealCounts.set(key,n);dealNumbers.set(d.id,`DL-${short(d.buyer?.name||"UNMATCHED")}_${short(d.seller?.name||"UNKNOWN")}_${n}`);}
  const displayDeals=deals.map(d=>({...d,dealNumber:dealNumbers.get(d.id)||d.id}));

  // Prisma Decimal/Date values cannot cross the Server -> Client Component boundary.
  // Convert the complete query result to JSON-safe values before passing it to DocumentCenter.
  return <DocumentCenter
    company={serialize(company)}
    purchases={serialize(purchases)}
    salesOrders={serialize(salesOrders)}
    deals={serialize(displayDeals)}
    documents={serialize(documents)}
  />;
}

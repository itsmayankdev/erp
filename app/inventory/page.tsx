import { prisma } from "@/lib/prisma";
import InventoryClient from "@/components/InventoryClient";

export const dynamic="force-dynamic";

export default async function InventoryPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;

  const stocks=await prisma.stock.findMany({
    where:{companyId:company.id},
    include:{
      material:true,
      warehouse:true,
      purchase:{include:{seller:true}},
      deal:{include:{seller:true,buyer:true}},
      stockAllocations:{
        include:{
          warehouse:true,
          salesOrder:{include:{buyer:true}}
        },
        orderBy:{allocatedAt:"desc"}
      }
    },
    orderBy:{createdAt:"desc"}
  });

  return <main className="modulePage">
    <header className="moduleHeader">
      <div>
        <p className="eyebrow">INVENTORY CONTROL</p>
        <h1>Inventory</h1>
        <p className="muted">{company.name} · Central stock position, reservations, valuation and exact stock usage.</p>
      </div>
    </header>
    <InventoryClient stocks={JSON.parse(JSON.stringify(stocks))} companyName={company.name}/>
  </main>;
}
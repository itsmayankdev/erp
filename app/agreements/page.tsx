import { prisma } from "@/lib/prisma";
import AgreementsClient from "@/components/AgreementsClient";

export const dynamic = "force-dynamic";

export default async function AgreementsPage(){
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return <main className="modulePage"><div className="modulePanel"><h2>Company not initialized</h2></div></main>;

  const [agreements,deals]=await Promise.all([
    prisma.agreement.findMany({
      where:{companyId:company.id},
      include:{deal:{include:{seller:true,buyer:true,material:true}}},
      orderBy:{updatedAt:"desc"}
    }),
    prisma.deal.findMany({
      where:{companyId:company.id},
      include:{seller:true,buyer:true,material:true},
      orderBy:{createdAt:"asc"}
    })
  ]);

  const short=(name:string)=>{const s=(name||"UNM").replace(/[^a-zA-Z0-9]/g,"").toUpperCase();return s.slice(0,3)||"UNM"};
  const counts=new Map<string,number>();
  const dealNumbers=new Map<string,string>();
  for(const d of deals){
    const key=d.sellerId+"|"+(d.buyerId||"UNMATCHED");
    const n=(counts.get(key)||0)+1; counts.set(key,n);
    dealNumbers.set(d.id,`DL-${short(d.buyer?.name||"UNMATCHED")}_${short(d.seller?.name||"UNKNOWN")}_${n}`);
  }

  return <AgreementsClient
    companyId={company.id}
    companyName={company.name}
    agreements={JSON.parse(JSON.stringify(agreements))}
    deals={JSON.parse(JSON.stringify(deals))}
    dealNumbers={Object.fromEntries(dealNumbers)}
  />;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const modelMap: Record<string,string> = {
  opportunities:"opportunity",
  "market-intelligence":"priceIntelligence",
  "customers-and-buyers":"buyer",
  warehouses:"warehouse",
  agreements:"agreement",
  purchase:"purchase",
  sales:"salesOrder",
  deals:"deal",
  payments:"payment",
  "buyer-demands":"buyerDemand",
  sellers:"seller",
  materials:"material"
};

export async function GET(req: NextRequest) {
  const module = req.nextUrl.searchParams.get("module");
  const company = await prisma.company.findFirst({ orderBy:{createdAt:"asc"} });
  if (!company) return NextResponse.json({error:"Company not initialized"},{status:400});
  if (module === "master-data") {
    const [sellers,buyers,materials,warehouses,deals] = await Promise.all([
      prisma.seller.findMany({where:{companyId:company.id},select:{id:true,name:true}}),
      prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true}}),
      prisma.material.findMany({where:{companyId:company.id},select:{id:true,name:true,unit:true}}),
      prisma.warehouse.findMany({where:{companyId:company.id},select:{id:true,name:true}}),
      prisma.deal.findMany({where:{companyId:company.id},select:{id:true}})
    ]);
    return NextResponse.json({companyId:company.id,sellers,buyers,materials,warehouses,deals});
  }
  return NextResponse.json({error:"Unsupported module"},{status:400});
}

function clean(body:any) {
  const out:any={...body};
  delete out.id; delete out.companyId; delete out.createdAt; delete out.updatedAt;
  for(const k of Object.keys(out)) if(out[k]==="") out[k]=null;
  for(const k of ["quantity","askingRate","estimatedMarketRate","rate","targetRate","creditLimit","capacity","buyRate","sellRate","freightCost","loadingCost","otherCost","amount","version"]) if(out[k]!==undefined&&out[k]!==null&&out[k]!=="") out[k]=Number(out[k]);
  for(const k of ["requiredBy","validFrom","validUntil","signedAt","expectedDate","receivedAt","dispatchDate","deliveredAt","dueDate","paidAt"]) if(out[k]) out[k]=new Date(out[k]);
  return out;
}

export async function POST(req:NextRequest) {
  const module=req.nextUrl.searchParams.get("module")||"";
  const model=modelMap[module];
  if(!model) return NextResponse.json({error:"Unsupported module"},{status:400});
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return NextResponse.json({error:"Company not initialized"},{status:400});
  const body=clean(await req.json());
  try {
    const record=await (prisma as any)[model].create({data:{...body,companyId:company.id}});
    return NextResponse.json(record,{status:201});
  } catch(e:any) {
    const message = e?.message || "Unable to create record";
    if (message.includes("Unknown argument") && (message.includes("grade") || message.includes("specification"))) {
      return NextResponse.json({error:"ERP database/client is out of sync with the current schema. Run \`npm run db:sync\` in Codespaces, then restart \`npm run dev\`."},{status:500});
    }
    return NextResponse.json({error:message},{status:400});
  }
}

export async function PATCH(req:NextRequest) {
  const module=req.nextUrl.searchParams.get("module")||"";
  const model=modelMap[module]; const body=await req.json();
  if(!model||!body.id) return NextResponse.json({error:"Module and record id are required"},{status:400});
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return NextResponse.json({error:"Company not initialized"},{status:400});
  const data=clean(body); delete data.companyId;
  try {
    const record=await (prisma as any)[model].updateMany({where:{id:body.id,companyId:company.id},data});
    if(!record.count) return NextResponse.json({error:"Record not found"},{status:404});
    return NextResponse.json({ok:true});
  } catch(e:any) { return NextResponse.json({error:e?.message||"Unable to update record"},{status:400}); }
}

export async function DELETE(req:NextRequest) {
  const module=req.nextUrl.searchParams.get("module")||"";
  const model=modelMap[module];
  if(!model) return NextResponse.json({error:"Unsupported module"},{status:400});
  const body=await req.json().catch(()=>({}));
  if(!body.id) return NextResponse.json({error:"Record id is required"},{status:400});
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company) return NextResponse.json({error:"Company not initialized"},{status:400});
  try {
    if(module==="sellers"){
      const seller=await prisma.seller.findFirst({where:{id:String(body.id),companyId:company.id}});
      if(!seller) return NextResponse.json({error:"Seller record not found"}, {status:404});
      const [dealCount,purchaseCount]=await Promise.all([
        prisma.deal.count({where:{sellerId:seller.id,companyId:company.id}}),
        prisma.purchase.count({where:{sellerId:seller.id,companyId:company.id}})
      ]);
      if(dealCount||purchaseCount) return NextResponse.json({error:"This seller is linked to deals or purchases and cannot be deleted. Keep the seller and remove/close linked transactions first."},{status:409});
      await prisma.$transaction(async tx=>{
        await tx.opportunity.deleteMany({where:{sellerId:seller.id,companyId:company.id}});
        await tx.seller.delete({where:{id:seller.id}});
      });
      return NextResponse.json({ok:true});
    }
    const result=await (prisma as any)[model].deleteMany({where:{id:String(body.id),companyId:company.id}});
    if(!result.count) return NextResponse.json({error:"Record not found"}, {status:404});
    return NextResponse.json({ok:true});
  } catch(e:any) {
    return NextResponse.json({error:"This record is linked to other ERP records and cannot be deleted. Close or unlink those records first."},{status:409});
  }
}

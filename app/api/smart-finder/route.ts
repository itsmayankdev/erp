import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const p=req.nextUrl.searchParams;
  const materialId=p.get("materialId")||"";
  const buyerId=p.get("buyerId")||"";
  const q=(p.get("q")||"").trim().toLowerCase();
  const location=(p.get("location")||"").trim().toLowerCase();
  const requested=Number(p.get("quantity")||0);
  const maxRate=Number(p.get("maxRate")||0);
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company)return NextResponse.json({error:"Company not initialized"},{status:400});

  const buyerDemand=buyerId?await prisma.buyerDemand.findFirst({where:{companyId:company.id,buyerId,status:{notIn:["Closed","Matched","Cancelled"]}},include:{material:true},orderBy:{updatedAt:"desc"}}):null;
  const effectiveMaterialId=materialId||buyerDemand?.materialId||"";
  const effectiveQuantity=requested||Number(buyerDemand?.quantity||0);
  const effectiveMaxRate=maxRate||Number(buyerDemand?.targetRate||0);
  const [opportunities,stocks]=await Promise.all([
    prisma.opportunity.findMany({where:{companyId:company.id,status:{notIn:["Closed","Cancelled","Converted"]}},include:{seller:true,material:true},orderBy:{updatedAt:"desc"}}),
    prisma.stock.findMany({where:{companyId:company.id,status:{in:["Available","Reserved","Incoming"]}},include:{material:true,warehouse:true},orderBy:{createdAt:"desc"}})
  ]);

  const results:any[]=[];
  for(const o of opportunities){
    const text=[o.material.name,o.material.grade,o.material.specification,o.notes,o.location].filter(Boolean).join(" ").toLowerCase();
    const materialMatch=!effectiveMaterialId||o.materialId===effectiveMaterialId;
    const queryMatch=!q||text.includes(q)||q.split(/s+/).every(x=>text.includes(x));
    const locationMatch=!location||String(o.location||"").toLowerCase().includes(location);
    const qty=Number(o.quantity);
    const rate=o.askingRate?Number(o.askingRate):null;
    if(!materialMatch||!queryMatch||!locationMatch||(effectiveMaxRate&&rate&&rate>effectiveMaxRate))continue;
    let score=55;
    if(effectiveMaterialId&&o.materialId===effectiveMaterialId)score+=20;
    if(effectiveQuantity&&qty>=effectiveQuantity)score+=15; else if(effectiveQuantity&&qty>0)score+=7;
    if(location&&locationMatch)score+=5;
    if(effectiveMaxRate&&rate&&rate<=effectiveMaxRate)score+=5;
    results.push({id:o.id,source:"Supplier opportunity",material:o.material.name,grade:o.material.grade,specification:o.material.specification,quantity:qty,unit:o.unit,rate,location:o.location||o.seller.city,matchScore:Math.min(score,99),seller:o.seller.name});
  }
  for(const s of stocks){
    const text=[s.material.name,s.material.grade,s.material.specification,s.warehouse?.name,s.warehouse?.city].filter(Boolean).join(" ").toLowerCase();
    const materialMatch=!effectiveMaterialId||s.materialId===effectiveMaterialId;
    const queryMatch=!q||q.split(/s+/).every(x=>text.includes(x));
    const locationMatch=!location||text.includes(location);
    const qty=Number(s.quantity)-Number(s.reservedQty);
    const rate=s.unitCost?Number(s.unitCost):null;
    if(qty<=0||!materialMatch||!queryMatch||!locationMatch||(maxRate&&rate&&rate>maxRate))continue;
    let score=62;
    if(effectiveMaterialId)score+=18;
    if(effectiveQuantity&&qty>=effectiveQuantity)score+=12; else if(effectiveQuantity)score+=5;
    if(location)score+=5;
    results.push({id:s.id,source:"Company inventory",material:s.material.name,grade:s.material.grade,specification:s.material.specification,quantity:qty,unit:s.material.unit,rate,location:s.warehouse?.city||s.warehouse?.name,matchScore:Math.min(score,99),seller:"Steel OS Inventory"});
  }
  results.sort((a,b)=>b.matchScore-a.matchScore || (a.rate??999999)-(b.rate??999999));
  const totalAvailable=results.reduce((n,r)=>n+r.quantity,0);
  const rates=results.map(r=>r.rate).filter((x:any)=>x!==null);
  return NextResponse.json({results,summary:{buyerDemand:buyerDemand?.id||null,requestedQuantity:effectiveQuantity,requestedMaterial:buyerDemand?.material?.name||null,matches:results.length,totalAvailable,lowestRate:rates.length?Math.min(...rates):null,combinations:effectiveQuantity&&totalAvailable>=effectiveQuantity?1:0}});
}
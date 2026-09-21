import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req:NextRequest){
 const body=await req.json();
 const demandId=String(body.demandId||"");
 const allocations:Array<{opportunityId:string;quantity:number}>=Array.isArray(body.allocations)?body.allocations:[];
 if(!demandId||!allocations.length)return NextResponse.json({error:"Buyer requirement and at least one supply allocation are required."},{status:400});
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return NextResponse.json({error:"Company not initialized"},{status:400});
 try{
  const result=await prisma.$transaction(async tx=>{
   const demand=await tx.buyerDemand.findFirst({where:{id:demandId,companyId:company.id},include:{buyer:true,material:true}});
   if(!demand)throw new Error("Buyer requirement not found.");
   const remainingDemand=Math.max(0,Number(demand.quantity)-Number(demand.matchedQuantity||0));
   const requested=allocations.reduce((n,a)=>n+Number(a.quantity),0);
   if(requested<=0||requested>remainingDemand+0.0001)throw new Error("Allocation exceeds the buyer's remaining requirement.");
   const created:any[]=[];
   for(const a of allocations){
    const op=await tx.opportunity.findFirst({where:{id:a.opportunityId,companyId:company.id},include:{seller:true,material:true}});
    if(!op)throw new Error("One of the selected supply records no longer exists.");
    if(op.materialId!==demand.materialId)throw new Error("All selected supplies must be for the same material.");
    const available=Math.max(0,Number(op.quantity)-Number(op.allocatedQuantity||0));
    const qty=Number(a.quantity);
    if(qty<=0||qty>available+0.0001)throw new Error("One allocation exceeds the supplier's remaining available quantity.");
    const buy=Number(op.askingRate||0), sell=Number(demand.targetRate||op.estimatedMarketRate||0);
    const freight=0, loading=0, other=0;
    const landed=qty*buy+freight+loading+other;
    const revenue=sell?qty*sell:null;
    const profit=revenue===null?null:revenue-landed;
    const margin=revenue&&revenue>0&&profit!==null?profit/revenue:null;
    const deal=await tx.deal.create({data:{
      companyId:company.id,opportunityId:op.id,demandId:demand.id,sellerId:op.sellerId,buyerId:demand.buyerId,materialId:demand.materialId,
      quantity:qty,buyRate:buy,sellRate:sell||null,freightCost:freight,loadingCost:loading,otherCost:other,
      expectedLandedCost:landed,expectedProfit:profit,expectedMargin:margin,procurementType:op.sourceType||"Surplus / Dead Stock",
      status:"Matched",sellerCommitted:false,buyerCommitted:true,capitalExposure:true
    }});
    const nextAllocated=Number(op.allocatedQuantity||0)+qty;
    await tx.opportunity.update({where:{id:op.id},data:{allocatedQuantity:nextAllocated,status:nextAllocated>=Number(op.quantity)-0.0001?"Converted":"Partially Allocated"}});
    created.push(deal);
   }
   const nextMatched=Number(demand.matchedQuantity||0)+requested;
   await tx.buyerDemand.update({where:{id:demand.id},data:{matchedQuantity:nextMatched,status:nextMatched>=Number(demand.quantity)-0.0001?"Matched":"Partially Matched"}});
   return {created,requested,remainingAfter:Math.max(0,remainingDemand-requested)};
  });
  return NextResponse.json(result,{status:201});
 }catch(e:any){return NextResponse.json({error:e?.message||"Could not create split-source deals."},{status:400});}
}
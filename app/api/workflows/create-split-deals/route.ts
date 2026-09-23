import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body=await req.json();
  const demandId=String(body.demandId||"");
  const allocations:Array<{opportunityId:string;quantity:number}>=Array.isArray(body.allocations)?body.allocations:[];
  if(!demandId||!allocations.length)return NextResponse.json({error:"Buyer requirement and at least one supply source are required."},{status:400});
  const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
  if(!company)return NextResponse.json({error:"Company not initialized"},{status:400});
  try{
    const result=await prisma.$transaction(async tx=>{
      const demand=await tx.buyerDemand.findFirst({where:{id:demandId,companyId:company.id},include:{buyer:true,material:true}});
      if(!demand)throw new Error("Buyer requirement not found.");
      const remainingDemand=Number(demand.quantity)-Number(demand.matchedQuantity||0);
      const grouped=new Map<string,number>();
      for(const a of allocations){const id=String(a.opportunityId||"");const q=Number(a.quantity||0);if(id&&q>0)grouped.set(id,(grouped.get(id)||0)+q);}
      const clean=[...grouped.entries()].map(([opportunityId,quantity])=>({opportunityId,quantity}));
      const requested=clean.reduce((n,a)=>n+a.quantity,0);
      if(requested<=0)throw new Error("No positive allocation was supplied.");
      if(requested>remainingDemand+0.0001)throw new Error(`Allocation of ${requested} exceeds the remaining buyer requirement of ${remainingDemand}.`);
      const sources:any[]=[];
      for(const a of clean){
        const o=await tx.opportunity.findFirst({where:{id:a.opportunityId,companyId:company.id},include:{seller:true,material:true}});
        if(!o)throw new Error("One of the selected supply records no longer exists.");
        if(o.materialId!==demand.materialId)throw new Error("All selected supplies must be for the same material.");
        const available=Number(o.quantity)-Number(o.allocatedQuantity||0);
        if(a.quantity>available+0.0001)throw new Error(`${o.seller.name} only has ${available} ${o.unit} remaining.`);
        sources.push({opportunityId:o.id,sellerId:o.sellerId,materialId:o.materialId,quantity:a.quantity,buyRate:Number(o.askingRate||0),location:o.location||o.seller.city});
      }
      const weightedBuyValue=sources.reduce((sum,s)=>sum+s.quantity*s.buyRate,0);
      const weightedBuyRate=requested>0?weightedBuyValue/requested:0;
      const sellRate=Number(demand.targetRate||sources[0]?.buyRate||0);
      const expectedLandedCost=weightedBuyValue, expectedRevenue=sellRate>0?requested*sellRate:null;
      const expectedProfit=expectedRevenue===null?null:expectedRevenue-expectedLandedCost;
      const expectedMargin=expectedRevenue&&expectedRevenue>0&&expectedProfit!==null?(expectedProfit/expectedRevenue)*100:null;
      const master=await tx.deal.create({data:{
        companyId:company.id,opportunityId:sources[0].opportunityId,demandId:demand.id,sellerId:sources[0].sellerId,buyerId:demand.buyerId,
        materialId:demand.materialId,quantity:requested,buyRate:weightedBuyRate,sellRate:sellRate||null,expectedLandedCost,expectedProfit,expectedMargin,
        procurementType:"Multi-Source / Combined Purchase",status:requested>=remainingDemand-0.0001?"Matched":"Partially Matched",
        sellerCommitted:false,buyerCommitted:true,capitalExposure:false,
        dealSources:{create:sources.map(s=>({companyId:company.id,opportunityId:s.opportunityId,sellerId:s.sellerId,quantity:s.quantity,buyRate:s.buyRate,location:s.location}))}
      },include:{seller:true,buyer:true,material:true,demand:true,dealSources:{include:{seller:true,opportunity:true}}}});
      for(const s of sources){
        const o=await tx.opportunity.findFirst({where:{id:s.opportunityId,companyId:company.id}});
        if(!o)throw new Error("Supply source disappeared during allocation.");
        const available=Number(o.quantity)-Number(o.allocatedQuantity||0);
        if(s.quantity>available+0.0001)throw new Error("Supply availability changed while allocating. Please retry.");
        const next=Number(o.allocatedQuantity||0)+s.quantity;
        await tx.opportunity.update({where:{id:o.id},data:{allocatedQuantity:next,status:next>=Number(o.quantity)-0.0001?"Converted":"Partially Allocated"}});
      }
      const nextMatched=Number(demand.matchedQuantity||0)+requested;
      await tx.buyerDemand.update({where:{id:demand.id},data:{matchedQuantity:nextMatched,status:nextMatched>=Number(demand.quantity)-0.0001?"Matched":"Partially Matched"}});
      return {deal:master,sources,requested,remainingDemand:Math.max(0,remainingDemand-requested)};
    },{isolationLevel:"Serializable"});
    return NextResponse.json(result,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not create the combined deal."},{status:400});}
}

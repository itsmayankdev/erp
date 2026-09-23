import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1), opportunityId: z.string().min(1), demandId: z.string().optional().nullable(),
  buyerId: z.string().optional().nullable(), sellRate: z.coerce.number().positive().optional().nullable(),
  procurementType: z.string().default("Surplus / Dead Stock"), freightCost: z.coerce.number().nonnegative().default(0),
  loadingCost: z.coerce.number().nonnegative().default(0), otherCost: z.coerce.number().nonnegative().default(0),
  sellerCommitted: z.boolean().default(true), buyerCommitted: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  try {
    const input=schema.parse(await req.json());
    const result=await prisma.$transaction(async tx=>{
      const opportunity=await tx.opportunity.findFirst({where:{id:input.opportunityId,companyId:input.companyId},include:{seller:true,material:true}});
      if(!opportunity) throw new Error("Opportunity not found");
      const demand=input.demandId?await tx.buyerDemand.findFirst({where:{id:input.demandId,companyId:input.companyId},include:{buyer:true,material:true}}):null;
      if(demand&&demand.materialId!==opportunity.materialId) throw new Error("Opportunity and demand materials do not match.");
      const buyerId=input.buyerId??demand?.buyerId??null;
      if(buyerId){
        const buyer=await tx.buyer.findFirst({where:{id:buyerId,companyId:input.companyId}});
        if(!buyer) throw new Error("Buyer does not belong to this company.");
        if(demand&&demand.buyerId!==buyerId) throw new Error("Buyer does not match the selected demand.");
      }
      const supplyRemaining=Math.max(0,Number(opportunity.quantity)-Number(opportunity.allocatedQuantity||0));
      const demandRemaining=demand?Math.max(0,Number(demand.quantity)-Number(demand.matchedQuantity||0)):supplyRemaining;
      const quantity=Math.min(supplyRemaining,demandRemaining);
      if(quantity<=0) throw new Error("No remaining quantity is available to convert.");
      const buyRate=Number(opportunity.askingRate??0);
      const sellRate=input.sellRate??(demand?.targetRate?Number(demand.targetRate):Number(opportunity.estimatedMarketRate??0));
      const landed=quantity*buyRate+input.freightCost+input.loadingCost+input.otherCost;
      const revenue=sellRate>0?quantity*sellRate:null;
      const profit=revenue===null?null:revenue-landed;
      const margin=revenue&&revenue>0?(profit!/revenue)*100:null;
      const deal=await tx.deal.create({data:{
        companyId:input.companyId,opportunityId:opportunity.id,demandId:demand?.id??null,sellerId:opportunity.sellerId,buyerId,
        materialId:opportunity.materialId,quantity,buyRate,sellRate:sellRate||null,freightCost:input.freightCost,loadingCost:input.loadingCost,
        otherCost:input.otherCost,expectedLandedCost:landed,expectedProfit:profit,expectedMargin:margin,procurementType:input.procurementType,
        status:input.buyerCommitted?"Committed":demand?"Partially Matched":"Opportunity",sellerCommitted:input.sellerCommitted,buyerCommitted:input.buyerCommitted,
        capitalExposure:input.sellerCommitted&&!input.buyerCommitted
      },include:{seller:true,buyer:true,material:true,opportunity:true,demand:true}});
      const nextAllocated=Number(opportunity.allocatedQuantity||0)+quantity;
      await tx.opportunity.update({where:{id:opportunity.id},data:{allocatedQuantity:nextAllocated,status:nextAllocated>=Number(opportunity.quantity)-0.0001?"Converted":"Partially Allocated"}});
      if(demand){
        const nextMatched=Number(demand.matchedQuantity||0)+quantity;
        await tx.buyerDemand.update({where:{id:demand.id},data:{matchedQuantity:nextMatched,status:nextMatched>=Number(demand.quantity)-0.0001?"Matched":nextMatched>0?"Partially Matched":demand.status}});
      }
      return deal;
    },{isolationLevel:"Serializable"});
    return NextResponse.json(result,{status:201});
  } catch(e) { return NextResponse.json({error:"Deal conversion failed",detail:e instanceof Error?e.message:"Unknown error"},{status:400}); }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1), dealId: z.string().optional().nullable(), buyerId: z.string().min(1), materialId: z.string().min(1),
  reference: z.string().min(1), quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative(),
  status: z.string().default("Planned"), dispatchDate: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  const companyId=req.nextUrl.searchParams.get("companyId");
  if(!companyId)return NextResponse.json({error:"companyId is required"},{status:400});
  return NextResponse.json(await prisma.salesOrder.findMany({
    where:{companyId},include:{buyer:true,material:true,deal:true,stockAllocations:{include:{stock:{include:{warehouse:true}}}}},orderBy:{createdAt:"desc"}
  }));
}

export async function POST(req: NextRequest) {
  try{
    const body=schema.parse(await req.json());
    const order=await prisma.$transaction(async tx=>{
      const [buyer,material,deal]=await Promise.all([
        tx.buyer.findFirst({where:{id:body.buyerId,companyId:body.companyId}}),
        tx.material.findFirst({where:{id:body.materialId,companyId:body.companyId}}),
        body.dealId?tx.deal.findFirst({where:{id:body.dealId,companyId:body.companyId}}):Promise.resolve(null)
      ]);
      if(!buyer)throw new Error("Buyer does not belong to this company.");
      if(!material)throw new Error("Material does not belong to this company.");
      if(body.dealId&&(!deal||deal.materialId!==body.materialId||(deal.buyerId&&deal.buyerId!==body.buyerId)))throw new Error("Sales order deal linkage is invalid.");

      if(deal){
        const existing=await tx.salesOrder.aggregate({where:{companyId:body.companyId,dealId:deal.id,status:{notIn:["Cancelled"]}},_sum:{quantity:true}});
        const already=Number(existing._sum.quantity||0);
        if(already+body.quantity>Number(deal.quantity)+0.0001)throw new Error(`Sales quantity ${already+body.quantity} exceeds deal quantity ${Number(deal.quantity)}.`);
      }

      const stocks=await tx.stock.findMany({
        where:{companyId:body.companyId,materialId:body.materialId,status:{in:["Available","Reserved"]},...(deal?{dealId:deal.id}:{})},
        include:{warehouse:true},orderBy:{createdAt:"asc"}
      });
      let remaining=body.quantity;
      const usable=stocks.map(stock=>({stock,available:Number(stock.quantity)-Number(stock.reservedQty)})).filter(x=>x.available>0);
      const totalAvailable=usable.reduce((sum,x)=>sum+x.available,0);
      if(totalAvailable+0.0001<body.quantity){
        throw new Error(deal
          ? `Insufficient available stock for this deal. Required ${body.quantity}, available ${totalAvailable}.`
          : `Insufficient available stock. Required ${body.quantity}, available ${totalAvailable}.`);
      }

      const created=await tx.salesOrder.create({data:body});
      for(const item of usable){
        if(remaining<=0)break;
        const take=Math.min(remaining,item.available);
        const reserved=await tx.stock.updateMany({
          where:{id:item.stock.id,companyId:body.companyId,materialId:body.materialId,status:{in:["Available","Reserved"]},reservedQty:{lte:Number(item.stock.quantity)-take}},
          data:{reservedQty:{increment:take},status:"Reserved"}
        });
        if(reserved.count!==1)throw new Error("Stock changed while this order was being allocated. Please retry.");
        await tx.stockAllocation.create({data:{companyId:body.companyId,stockId:item.stock.id,salesOrderId:created.id,quantity:take,warehouseId:item.stock.warehouseId,status:"Reserved"}});
        remaining-=take;
      }

      return tx.salesOrder.findUniqueOrThrow({where:{id:created.id},include:{buyer:true,material:true,deal:true,stockAllocations:{include:{stock:{include:{warehouse:true}}}}}});
    },{isolationLevel:"Serializable"});
    return NextResponse.json(order,{status:201});
  }catch(e){return NextResponse.json({error:"Sales order could not be created",detail:e instanceof Error?e.message:"Unknown error"},{status:400});}
}

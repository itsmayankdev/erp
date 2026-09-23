import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().min(1),
  buyerId: z.string().optional().nullable(),
  purchaseId: z.string().optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  reference: z.string().trim().optional(),
  type: z.enum(["Received","Paid","RECEIPT","PAYMENT"]),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date().optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
  status: z.string().default("Paid"),
  notes: z.string().optional().nullable(),
}).superRefine((v,ctx)=>{
  if (!v.purchaseId && !v.salesOrderId) ctx.addIssue({code:z.ZodIssueCode.custom,path:["purchaseId"],message:"Link the payment to a purchase or sales order."});
  if (v.purchaseId && v.salesOrderId) ctx.addIssue({code:z.ZodIssueCode.custom,path:["purchaseId"],message:"A payment can be linked to only one commercial document."});
});

export async function GET(req: NextRequest) {
  const companyId=req.nextUrl.searchParams.get("companyId");
  if(!companyId) return NextResponse.json({error:"companyId is required"},{status:400});
  return NextResponse.json(await prisma.payment.findMany({
    where:{companyId},
    include:{buyer:true,purchase:{include:{seller:true,material:true}},salesOrder:{include:{buyer:true,material:true}}},
    orderBy:{createdAt:"desc"}
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body=schema.parse(await req.json());
    const result=await prisma.$transaction(async tx=>{
      let finalBuyerId=body.buyerId||null;

      if(body.purchaseId){
        const purchase=await tx.purchase.findFirst({where:{id:body.purchaseId,companyId:body.companyId}});
        if(!purchase) throw new Error("Purchase not found for this company.");
        if(!["Paid","PAYMENT"].includes(body.type)) throw new Error("A purchase payment must use Paid/PAYMENT direction.");
        if(finalBuyerId) throw new Error("A payable cannot be linked to a buyer.");
        const already=await tx.payment.aggregate({where:{companyId:body.companyId,purchaseId:body.purchaseId,status:{not:"Cancelled"}},_sum:{amount:true}});
        const total=Number(purchase.quantity)*Number(purchase.rate)+Number(purchase.freightCost)+Number(purchase.loadingCost)+Number(purchase.otherCost);
        const outstanding=Math.max(0,total-Number(already._sum.amount||0));
        if(body.amount>outstanding+0.0001) throw new Error(`Payment exceeds outstanding payable of ₹${outstanding.toLocaleString("en-IN")}.`);
      }

      if(body.salesOrderId){
        const order=await tx.salesOrder.findFirst({where:{id:body.salesOrderId,companyId:body.companyId},include:{buyer:true}});
        if(!order) throw new Error("Sales order not found for this company.");
        if(!["Received","RECEIPT"].includes(body.type)) throw new Error("A sales receipt must use Received/RECEIPT direction.");
        if(finalBuyerId && finalBuyerId !== order.buyerId) throw new Error("Payment buyer does not match the sales order buyer.");
        finalBuyerId=order.buyerId;
        const already=await tx.payment.aggregate({where:{companyId:body.companyId,salesOrderId:body.salesOrderId,status:{not:"Cancelled"}},_sum:{amount:true}});
        const total=Number(order.quantity)*Number(order.rate);
        const outstanding=Math.max(0,total-Number(already._sum.amount||0));
        if(body.amount>outstanding+0.0001) throw new Error(`Receipt exceeds outstanding receivable of ₹${outstanding.toLocaleString("en-IN")}.`);
      }

      const reference=body.reference||`PAY-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now().toString().slice(-6)}`;
      let finalStatus=body.status;

      if(body.purchaseId){
        const purchase=await tx.purchase.findFirst({where:{id:body.purchaseId,companyId:body.companyId}});
        const already=await tx.payment.aggregate({where:{companyId:body.companyId,purchaseId:body.purchaseId,status:{not:"Cancelled"}},_sum:{amount:true}});
        const total=Number(purchase!.quantity)*Number(purchase!.rate)+Number(purchase!.freightCost)+Number(purchase!.loadingCost)+Number(purchase!.otherCost);
        finalStatus=Number(already._sum.amount||0)+body.amount>=total-0.0001?"Paid":"Partial";
      }

      if(body.salesOrderId){
        const order=await tx.salesOrder.findFirst({where:{id:body.salesOrderId,companyId:body.companyId}});
        const already=await tx.payment.aggregate({where:{companyId:body.companyId,salesOrderId:body.salesOrderId,status:{not:"Cancelled"}},_sum:{amount:true}});
        const total=Number(order!.quantity)*Number(order!.rate);
        finalStatus=Number(already._sum.amount||0)+body.amount>=total-0.0001?"Paid":"Partial";
      }

      return tx.payment.create({
        data:{
          companyId:body.companyId,buyerId:finalBuyerId||undefined,
          purchaseId:body.purchaseId||undefined,salesOrderId:body.salesOrderId||undefined,
          reference,type:body.type,amount:body.amount,dueDate:body.dueDate||undefined,
          paidAt:body.paidAt||new Date(),status:finalStatus,notes:body.notes||undefined
        },
        include:{buyer:true,purchase:{include:{seller:true}},salesOrder:{include:{buyer:true}}}
      });
    });
    return NextResponse.json(result,{status:201});
  } catch(e) {
    return NextResponse.json({error:"Payment could not be recorded",detail:e instanceof Error?e.message:"Unknown error"},{status:400});
  }
}

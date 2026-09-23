import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function n(v:any){ return Number(v||0); }

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const deal=await prisma.deal.findUnique({
    where:{id},
    include:{purchases:{where:{status:"Received"}},salesOrders:true}
  });
  if(!deal) return NextResponse.json({error:"Deal not found"},{status:404});

  const purchaseCost=deal.purchases.reduce((s,p)=>s+n(p.quantity)*n(p.rate)+n(p.freightCost)+n(p.loadingCost)+n(p.otherCost),0);
  const purchasedQty=deal.purchases.reduce((s,p)=>s+n(p.quantity),0);
  const salesRevenue=deal.salesOrders.reduce((s,o)=>s+n(o.quantity)*n(o.rate),0);
  const soldQty=deal.salesOrders.reduce((s,o)=>s+n(o.quantity),0);
  const actualProfit=salesRevenue-purchaseCost;
  const actualMargin=salesRevenue>0?(actualProfit/salesRevenue)*100:null;
  return NextResponse.json({
    dealId:id,purchasedQty,soldQty,purchaseCost,salesRevenue,actualLandedCost:purchaseCost,
    actualProfit,actualMargin,expectedLandedCost:n(deal.expectedLandedCost),
    expectedProfit:n(deal.expectedProfit),expectedRevenue:n(deal.quantity)*n(deal.sellRate),
    profitVariance:actualProfit-n(deal.expectedProfit)
  });
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const result=await prisma.$transaction(async tx=>{
    const deal=await tx.deal.findUnique({where:{id},include:{purchases:{where:{status:"Received"}},salesOrders:true}});
    if(!deal) throw new Error("Deal not found");
    const purchaseCost=deal.purchases.reduce((s,p)=>s+n(p.quantity)*n(p.rate)+n(p.freightCost)+n(p.loadingCost)+n(p.otherCost),0);
    const salesRevenue=deal.salesOrders.reduce((s,o)=>s+n(o.quantity)*n(o.rate),0);
    const actualProfit=salesRevenue-purchaseCost;
    const actualMargin=salesRevenue>0?(actualProfit/salesRevenue)*100:null;
    const updated=await tx.deal.update({
      where:{id},
      data:{actualLandedCost:purchaseCost,actualProfit,actualMargin}
    });
    return {deal:updated,purchasedQty:deal.purchases.reduce((s,p)=>s+n(p.quantity),0),soldQty:deal.salesOrders.reduce((s,o)=>s+n(o.quantity),0),purchaseCost,salesRevenue,actualProfit,actualMargin,profitVariance:actualProfit-n(deal.expectedProfit)};
  });
  return NextResponse.json(result);
}

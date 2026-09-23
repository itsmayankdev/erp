import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function n(v:any){ return Number(v||0); }

async function calculate(id:string){
  const deal=await prisma.deal.findUnique({where:{id},include:{purchases:{where:{status:"Received"}},salesOrders:{where:{status:{in:["Dispatched","Delivered"]}}}}});
  if(!deal) return null;
  const purchaseCost=deal.purchases.reduce((s,p)=>s+n(p.quantity)*n(p.rate)+n(p.freightCost)+n(p.loadingCost)+n(p.otherCost),0);
  const purchasedQty=deal.purchases.reduce((s,p)=>s+n(p.quantity),0);
  const salesRevenue=deal.salesOrders.reduce((s,o)=>s+n(o.quantity)*n(o.rate),0);
  const soldQty=deal.salesOrders.reduce((s,o)=>s+n(o.quantity),0);
  const actualProfit=salesRevenue-purchaseCost;
  const actualMargin=salesRevenue>0?(actualProfit/salesRevenue)*100:null;
  return {deal,purchasedQty,soldQty,purchaseCost,salesRevenue,actualProfit,actualMargin};
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const data=await calculate(id);
  if(!data)return NextResponse.json({error:"Deal not found"},{status:404});
  return NextResponse.json({dealId:id,purchasedQty:data.purchasedQty,soldQty:data.soldQty,purchaseCost:data.purchaseCost,salesRevenue:data.salesRevenue,actualLandedCost:data.purchaseCost,actualProfit:data.actualProfit,actualMargin:data.actualMargin,expectedLandedCost:n(data.deal.expectedLandedCost),expectedProfit:n(data.deal.expectedProfit),expectedRevenue:n(data.deal.quantity)*n(data.deal.sellRate),profitVariance:data.actualProfit-n(data.deal.expectedProfit)});
}

export async function POST(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const data=await calculate(id);
  if(!data)return NextResponse.json({error:"Deal not found"},{status:404});
  const updated=await prisma.deal.update({where:{id},data:{actualLandedCost:data.purchaseCost,actualProfit:data.actualProfit,actualMargin:data.actualMargin}});
  return NextResponse.json({deal:updated,purchasedQty:data.purchasedQty,soldQty:data.soldQty,purchaseCost:data.purchaseCost,salesRevenue:data.salesRevenue,actualProfit:data.actualProfit,actualMargin:data.actualMargin,profitVariance:data.actualProfit-n(updated.expectedProfit)});
}

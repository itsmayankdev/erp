import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const company=await prisma.company.findFirst({orderBy:{createdAt:"asc"}});
 if(!company)return NextResponse.json({error:"Company not initialized"},{status:400});
 const [sellers,buyers,materials]=await Promise.all([
  prisma.seller.findMany({where:{companyId:company.id},select:{id:true,name:true},orderBy:{name:"asc"}}),
  prisma.buyer.findMany({where:{companyId:company.id},select:{id:true,name:true},orderBy:{name:"asc"}}),
  prisma.material.findMany({where:{companyId:company.id,active:true},select:{id:true,name:true,grade:true,specification:true,unit:true},orderBy:{name:"asc"}})
 ]);
 return NextResponse.json({companyId:company.id,sellers,buyers,materials});
}
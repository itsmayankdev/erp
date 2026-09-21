import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf, buildSvg, titleFor, type DocumentType } from "@/lib/document-template";
import { getDocumentData } from "@/lib/document-data";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
const valid=new Set(["PURCHASE_ORDER","SALES_ORDER","INVOICE","QUOTATION"]);
export async function POST(req:NextRequest){
 try{ const body=await req.json(); const type=String(body.type) as DocumentType; const id=String(body.sourceId||""); const format=String(body.format||"PDF").toUpperCase(); if(!valid.has(type)||!id) return NextResponse.json({error:"type and sourceId are required"},{status:400}); if(format!=="PDF"&&format!=="SVG") return NextResponse.json({error:"format must be PDF or SVG"},{status:400});
 const data=await getDocumentData(type,id); const ext=format==="PDF"?"pdf":"svg"; const filename=(data.number+"-"+type+"."+ext).replace(/[^a-zA-Z0-9._-]/g,"_"); const dir=path.join(process.cwd(),"public","generated-documents"); await mkdir(dir,{recursive:true}); const bytes=format==="PDF"?await buildPdf(data):Buffer.from(buildSvg(data),"utf8"); await writeFile(path.join(dir,filename),bytes);
 await prisma.document.create({data:{companyId:data.company.id,name:titleFor(type)+" - "+data.number,type,reference:data.number,storageKey:"/generated-documents/"+filename,entityType:type,entityId:id,format,generatedAt:new Date(),status:"Generated"}});
 return NextResponse.json({ok:true,url:"/generated-documents/"+filename,filename,type,number:data.number});
 }catch(e){return NextResponse.json({error:"Document generation failed",detail:e instanceof Error?e.message:"Unknown error"},{status:400})}
}
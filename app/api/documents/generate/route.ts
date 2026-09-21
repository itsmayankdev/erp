import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf, buildSvg, titleFor, type DocumentType } from "@/lib/document-template";
import { getDocumentData } from "@/lib/document-data";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
const valid=new Set(["PURCHASE_ORDER","SALES_ORDER","INVOICE","QUOTATION"]);
export async function POST(req:NextRequest){
 try{ const body=await req.json(); const type=String(body.type) as DocumentType; const id=String(body.sourceId||""); const format=String(body.format||"PDF").toUpperCase(); if(!valid.has(type)||!id) return NextResponse.json({error:"type and sourceId are required"},{status:400}); if(format!=="PDF"&&format!=="SVG") return NextResponse.json({error:"format must be PDF or SVG"},{status:400});
 const data=await getDocumentData(type,id); const now=new Date(); const year=now.getFullYear(); const prefix=({PURCHASE_ORDER:"PO",SALES_ORDER:"SO",INVOICE:"INV",QUOTATION:"QUO"} as any)[type];
 const existing=await prisma.document.findFirst({where:{companyId:data.company.id,type,sourceType:type,sourceId:id},orderBy:{version:"desc"}});
 let docNumber=existing?.reference || ""; let version=(existing?.version||0)+1;
 if(!docNumber){ const seq=await prisma.documentSequence.upsert({where:{companyId_type_year:{companyId:data.company.id,type,year}},create:{companyId:data.company.id,type,year,prefix,nextNumber:2},update:{nextNumber:{increment:1}}}); docNumber=prefix+"-"+year+"-"+String(seq.nextNumber-1).padStart(6,"0"); version=1; }
 data.number=docNumber; const ext=format==="PDF"?"pdf":"svg"; const filename=(docNumber+"-v"+version+"-"+type+"."+ext).replace(/[^a-zA-Z0-9._-]/g,"_"); const dir=path.join(process.cwd(),"public","generated-documents"); await mkdir(dir,{recursive:true}); const bytes=format==="PDF"?await buildPdf(data):Buffer.from(buildSvg(data),"utf8"); await writeFile(path.join(dir,filename),bytes);
 const row=await prisma.document.create({data:{companyId:data.company.id,name:titleFor(type)+" - "+docNumber+" v"+version,type,reference:docNumber,version,sourceType:type,sourceId:id,storageKey:"/generated-documents/"+filename,entityType:type,entityId:id,format,generatedAt:new Date(),status:"Generated"}});
 return NextResponse.json({ok:true,url:"/generated-documents/"+filename,filename,type,number:docNumber,version:row.version});
 }catch(e){return NextResponse.json({error:"Document generation failed",detail:e instanceof Error?e.message:"Unknown error"},{status:400})}
}
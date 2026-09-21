import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const doc=await prisma.document.findUnique({where:{id}});
    if(!doc) return NextResponse.json({error:"Document not found"},{status:404});
    const filename=path.basename(doc.storageKey);
    const file=await readFile(path.join(process.cwd(),"public","generated-documents",filename));
    const contentType=doc.format==="PDF"?"application/pdf":"image/svg+xml";
    return new NextResponse(file,{headers:{"Content-Type":contentType,"Content-Disposition":`inline; filename="${filename}"`,"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({error:"Generated file not found",detail:e instanceof Error?e.message:"Unknown error"},{status:404});
  }
}
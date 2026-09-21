import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const stock = await prisma.stock.findMany({
    where: { companyId }, include: { material: true, warehouse: true, deal: true }, orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(stock);
}

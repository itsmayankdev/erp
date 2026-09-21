import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "erp-api", database: "connected", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, service: "erp-api", database: "unavailable" }, { status: 503 });
  }
}

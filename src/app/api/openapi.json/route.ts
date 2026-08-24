import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(openapiSpec);
}

import { NextResponse } from "next/server";
import { getSequences } from "@/lib/data";

export async function GET() {
  try {
    const sequences = await getSequences();
    return NextResponse.json(sequences);
  } catch (error) {
    console.error("GET /api/sequences error:", error);
    return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 });
  }
}

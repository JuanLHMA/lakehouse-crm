import { NextRequest, NextResponse } from "next/server";
import { getSequences, createSequence } from "@/lib/data";

export async function GET() {
  try {
    const sequences = await getSequences();
    return NextResponse.json(sequences);
  } catch (error) {
    console.error("GET /api/sequences error:", error);
    return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sequence = await createSequence(body);
    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    console.error("POST /api/sequences error:", error);
    return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 });
  }
}

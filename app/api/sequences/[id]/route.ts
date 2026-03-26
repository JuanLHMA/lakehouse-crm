import { NextRequest, NextResponse } from "next/server";
import { updateSequence } from "@/lib/data";
import type { Sequence } from "@/lib/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as Partial<Omit<Sequence, "id">>;
    const sequence = await updateSequence(id, body);
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }
    return NextResponse.json(sequence);
  } catch (error) {
    console.error("PUT /api/sequences/[id] error:", error);
    return NextResponse.json({ error: "Failed to update sequence" }, { status: 500 });
  }
}

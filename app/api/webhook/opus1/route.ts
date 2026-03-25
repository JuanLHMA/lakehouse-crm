import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/data";
import type { Lead } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Lead>;

    // Map Opus1 webhook payload to Lead format
    const leadData: Omit<Lead, "id" | "createdAt" | "updatedAt"> = {
      name: body.name ?? "Unknown",
      email: body.email ?? "",
      phone: body.phone ?? "",
      status: "active",
      phase: "assess",
      source: "opus1",
      instrument: body.instrument ?? "guitar",
      age: body.age ?? 0,
      notes: body.notes ?? "Lead received via Opus1 webhook",
      assignedTo: body.assignedTo ?? "Sarah Johnson",
      tags: ["opus1-webhook"],
      lastContactDate: new Date().toISOString(),
      nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const lead = await createLead(leadData);
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("POST /api/webhook/opus1 error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}

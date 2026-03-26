import { NextRequest, NextResponse } from "next/server";
import { getLeads, createLead } from "@/lib/data";
import type { Lead } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    let leads = await getLeads();

    if (phase) {
      leads = leads.filter((l) => l.phase === phase);
    }
    if (status) {
      leads = leads.filter((l) => l.status === status);
    }
    if (search) {
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          l.email.toLowerCase().includes(search) ||
          l.instrument.toLowerCase().includes(search) ||
          l.assignedTo.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Omit<Lead, "id" | "createdAt" | "updatedAt">;
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

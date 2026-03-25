import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { getLead, getSequences, createActivity } from "@/lib/data";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "noreply@lhcrm.site";

interface SequenceTriggerBody {
  leadId: string;
  sequenceId: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SequenceTriggerBody;
    const { leadId, sequenceId } = body;

    if (!leadId || !sequenceId) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, sequenceId" },
        { status: 400 }
      );
    }

    const [lead, sequences] = await Promise.all([getLead(leadId), getSequences()]);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const sequence = sequences.find((s) => s.id === sequenceId);
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const firstName = lead.name.split(" ")[0] ?? lead.name;
    const vars: Record<string, string> = {
      firstName,
      assignedTo: lead.assignedTo,
      nextLessonDate: "your next scheduled date",
      registrationDeadline: "this week",
    };

    // Send the first step (day 0) immediately; remaining steps are noted for scheduling
    const firstStep = sequence.steps[0];
    if (!firstStep) {
      return NextResponse.json({ error: "Sequence has no steps" }, { status: 400 });
    }

    const subject = interpolate(firstStep.subject, vars);
    const html = interpolate(firstStep.body, vars).replace(/\n/g, "<br>");

    await sgMail.send({
      to: lead.email,
      from: FROM_EMAIL,
      subject,
      html,
    });

    await createActivity({
      leadId,
      type: "email",
      content: `Sequence "${sequence.name}" started — sent: ${subject}`,
      createdBy: "System",
      metadata: {
        sequenceId,
        sequenceName: sequence.name,
        stepIndex: 0,
        subject,
        sentAt: new Date().toISOString(),
        remainingSteps: sequence.steps.length - 1,
      },
    });

    return NextResponse.json({
      success: true,
      sequenceName: sequence.name,
      emailSentTo: lead.email,
      stepsTotal: sequence.steps.length,
      firstStepSubject: subject,
    });
  } catch (error) {
    console.error("POST /api/email/sequence error:", error);
    return NextResponse.json({ error: "Failed to trigger sequence" }, { status: 500 });
  }
}

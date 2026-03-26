import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { createActivity } from "@/lib/data";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "noreply@lhcrm.site";

interface SendEmailBody {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  leadId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SendEmailBody;
    const { to, subject, html, templateId, leadId } = body;

    if (!to || !subject || (!html && !templateId)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html (or templateId)" },
        { status: 400 }
      );
    }

    const msg: sgMail.MailDataRequired = {
      to,
      from: FROM_EMAIL,
      subject,
      html,
      ...(templateId ? { templateId } : {}),
    };

    await sgMail.send(msg);

    if (leadId) {
      await createActivity({
        leadId,
        type: "email",
        content: `Email sent: ${subject}`,
        createdBy: "System",
        metadata: { to, subject, sentAt: new Date().toISOString() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const sgError = error as { response?: { body?: unknown }; message?: string };
    const detail = sgError?.response?.body ?? sgError?.message ?? error;
    console.error("POST /api/email/send error:", JSON.stringify(detail, null, 2));
    return NextResponse.json(
      { error: "Failed to send email", detail },
      { status: 500 }
    );
  }
}

import { z } from "zod";
import { getResend, getResendFromAddress } from "@/lib/email/resend";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  topic: z.string().min(1).max(80).optional(),
  message: z.string().min(10).max(5000),
});

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match ? match[1] : value;
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { name, email, topic, message } = parsed.data;
  const resend = getResend();
  if (!resend) {
    return new Response("Email service not configured", { status: 500 });
  }

  const supportEmailRaw =
    process.env.IXOS_SUPPORT_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "support@ixos.app";
  const supportEmail = extractEmail(supportEmailRaw);

  const userAgent = req.headers.get("user-agent");
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    await resend.emails.send({
      from: getResendFromAddress(),
      to: supportEmail,
      replyTo: email,
      subject: `[Ixos Support] ${topic ?? "General"} - ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Topic: ${topic ?? "General"}`,
        `IP: ${ip}`,
        `User Agent: ${userAgent ?? "unknown"}`,
        "",
        message,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Failed to send support email:", error);
    return new Response("Failed to send email", { status: 500 });
  }

  return Response.json({ ok: true });
}


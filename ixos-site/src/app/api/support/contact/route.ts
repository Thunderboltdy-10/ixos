import { z } from "zod";
import { sendEmail } from "@/lib/email/gmail";

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { name, email, topic, message } = parsed.data;

  const supportEmailRaw =
    process.env.IXOS_SUPPORT_EMAIL ||
    "Ixos Support <support@ixos.app>";
  const supportEmail = extractEmail(supportEmailRaw);

  const userAgent = req.headers.get("user-agent");
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const htmlContent = [
      `Name: ${escapeHtml(name)}`,
      `Email: ${escapeHtml(email)}`,
      `Topic: ${escapeHtml(topic ?? "General")}`,
      `IP: ${escapeHtml(ip)}`,
      `User Agent: ${escapeHtml(userAgent ?? "unknown")}`,
      "",
      escapeHtml(message),
    ].join("<br/>");

    const result = await sendEmail({
      to: supportEmail,
      replyTo: `${name} <${email}>`,
      subject: `[Ixos Support] ${topic ?? "General"} - ${name}`,
      html: htmlContent,
    });

    if (!result) {
      return new Response("Email service not configured", { status: 500 });
    }
  } catch (error) {
    console.error("Failed to send support email:", error);
    return new Response("Failed to send email", { status: 500 });
  }

  return Response.json({ ok: true });
}


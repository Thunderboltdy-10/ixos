import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function getResendFromAddress() {
  // Use Resend's shared domain for immediate functionality (no DNS setup needed)
  // Can upgrade to custom domain later by setting RESEND_FROM_EMAIL
  return process.env.RESEND_FROM_EMAIL || "Ixos <onboarding@resend.dev>";
}


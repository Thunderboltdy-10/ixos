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
  return process.env.RESEND_FROM_EMAIL || "Ixos <noreply@ixos.app>";
}


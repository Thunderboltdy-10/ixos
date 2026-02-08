import { getClerkUserIdFromRequest, TOKEN_ISSUER } from "@/lib/controlPlane";

export async function GET(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawKey = process.env.IXOS_JWT_PUBLIC_KEY;
  if (!rawKey) {
    return new Response("IXOS_JWT_PUBLIC_KEY not configured", { status: 500 });
  }

  const publicKey = rawKey.replace(/\\n/g, "\n").trim();
  if (!publicKey.includes("BEGIN PUBLIC KEY")) {
    return new Response("Invalid IXOS_JWT_PUBLIC_KEY format", { status: 500 });
  }

  return Response.json({
    issuer: TOKEN_ISSUER,
    publicKey,
  });
}

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that should bypass Clerk's session check
// These routes handle their own Bearer token authentication
const isDesktopApiRoute = createRouteMatcher(["/api/desktop(.*)"]);

// Routes that require Clerk authentication
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Desktop API routes: add CORS headers but skip Clerk session check
  // These routes verify Bearer tokens themselves via getClerkUserIdFromRequest
  if (isDesktopApiRoute(req)) {
    const origin = req.headers.get("origin") || "*";
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Requested-With");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Max-Age", "86400");
    headers.set("Vary", "Origin");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers });
    }

    // Let the request through - the route handler will verify the Bearer token
    const res = NextResponse.next();
    headers.forEach((value, key) => {
      res.headers.set(key, value);
    });
    return res;
  }

  // Protected routes require Clerk session
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

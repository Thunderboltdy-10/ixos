import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
    '/account(.*)',
]);

// Define public routes that are always accessible
const isPublicRoute = createRouteMatcher([
    '/',
    '/pricing',
    '/download',
    '/about',
    '/security',
    '/privacy',
    '/terms',
    '/changelog',
    '/blog(.*)',
    '/docs(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
    '/api/waitlist',
    '/api/download',
]);

export default clerkMiddleware((auth, req) => {
    // Protect dashboard routes
    if (isProtectedRoute(req)) {
        auth().protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};

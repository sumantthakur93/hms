import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Role-based route protection middleware.
 *
 * Maps route prefixes to required roles. This is the UX layer — the real
 * security boundary is in server action guards (inline WHERE clauses).
 *
 * Per RBAC decisions (#3):
 * - /admin/*         → ADMIN only
 * - /doctor/*        → DOCTOR only
 * - /patient/*       → PATIENT only
 * - /receptionist/*  → RECEPTIONIST only
 * - /lab/*           → LAB_TECHNICIAN only
 */
const roleRouteMap: Record<string, string> = {
  "/admin": "ADMIN",
  "/doctor": "DOCTOR",
  "/patient": "PATIENT",
  "/receptionist": "RECEPTIONIST",
  "/lab": "LAB_TECHNICIAN",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Auth routes and landing page — always public
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth")
  ) {
    return;
  }

  // All other routes require authentication
  if (!session?.user) {
    // API routes get a 401 JSON response (not a browser redirect) so API
    // clients can handle auth failures programmatically.
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Role-based route protection
  for (const [prefix, requiredRole] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(prefix) && session.user.role !== requiredRole) {
      // Redirect to the user's own dashboard
      const userPrefix = Object.entries(roleRouteMap).find(
        ([, role]) => role === session.user.role,
      )?.[0];
      return Response.redirect(new URL(userPrefix ?? "/", req.url));
    }
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

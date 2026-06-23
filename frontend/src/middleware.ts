import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const sessionToken = request.cookies.get("next-auth.session-token")?.value
      || request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/auth/v1/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect client portal routes
  if (pathname.startsWith("/portal")) {
    // Can't check localStorage from middleware (server-side),
    // so we check for a cookie we set on login, or let client-side handle it.
    // For now, let client-side auth handle portal routes.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

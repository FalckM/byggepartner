// Before a public URL: admin, moderator test mode and admin APIs sit behind Basic Auth when ADMIN_PASSWORD is set.
// Locally (no ADMIN_PASSWORD) everything stays open, so dev and E2E tests are unaffected.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse("Krever passord (admin og testmodus).", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Byggepartner admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/test/:path*", "/api/admin/:path*"],
};

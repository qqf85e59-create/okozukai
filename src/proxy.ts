import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth";

const PUBLIC_PATHS = ["/", "/api/auth/login", "/manifest.webmanifest", "/sw.js"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/uploads/") || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  // Allow cron endpoint with secret
  if (pathname === "/api/cron/run") {
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecret === expectedSecret) {
      return NextResponse.next();
    }
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // /admin/* ページは admin ロールのみ
  if (pathname.startsWith("/admin/") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};


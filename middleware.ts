import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/profile", "/admin"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/74b7bc1e-f939-4f27-8b41-5c9f42196d92", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "40b523",
    },
    body: JSON.stringify({
      sessionId: "40b523",
      runId: "review-1",
      hypothesisId: "H3",
      location: "middleware.ts:16",
      message: "middleware_token_state",
      data: {
        pathname,
        hasTokenSub: Boolean(token?.sub),
        role: token?.role ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!token?.sub) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(
      new URL("/profile?error=forbidden", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};

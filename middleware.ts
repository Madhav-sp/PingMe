import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/signup"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/public");

  // Allow auth API routes
  if (isAuthApi || isPublicApi) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicPath) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

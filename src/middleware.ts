import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    if (!secret || secret.length < 32) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const key = new TextEncoder().encode(secret);
      await jwtVerify(token, key);
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (
    (pathname === "/login" || pathname === "/register") &&
    token &&
    secret &&
    secret.length >= 32
  ) {
    try {
      const key = new TextEncoder().encode(secret);
      await jwtVerify(token, key);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      /* token inválido: dejar entrar a login */
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ACCESS_COOKIE, STORE_SESSION_COOKIE } from "@/lib/cookies";

// Chỉ kiểm tra có cookie hay không để điều hướng.
// Tính hợp lệ của token do backend quyết định khi gọi API.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasAdmin = req.cookies.has(ADMIN_ACCESS_COOKIE);
  const hasStore = req.cookies.has(STORE_SESSION_COOKIE);

  const redirect = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (pathname === "/admin/login") {
    return hasAdmin ? redirect("/admin/dashboard") : NextResponse.next();
  }
  if (pathname.startsWith("/admin")) {
    return hasAdmin ? NextResponse.next() : redirect("/admin/login");
  }

  if (pathname === "/store/login") {
    return hasStore ? redirect("/store/products") : NextResponse.next();
  }
  if (pathname.startsWith("/store")) {
    return hasStore ? NextResponse.next() : redirect("/store/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/store/:path*"],
};

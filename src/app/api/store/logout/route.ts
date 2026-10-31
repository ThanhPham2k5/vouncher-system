import { NextResponse } from "next/server";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ message: "Đã đăng xuất" });
  response.cookies.delete(STORE_SESSION_COOKIE);
  return response;
}

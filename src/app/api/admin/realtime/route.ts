import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyAdminCookies,
  clearAdminCookies,
  refreshBackendTokens,
  type BackendTokens,
} from "@/lib/admin-session";
import { BACKEND_URL } from "@/lib/config";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/cookies";

// Mở luồng SSE tới BE, trả null khi không kết nối được
async function openStream(
  token: string | undefined,
  signal: AbortSignal,
): Promise<Response | null> {
  try {
    return await fetch(`${BACKEND_URL}/statistic/stream`, {
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal,
    });
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const store = await cookies();
  const accessToken = store.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(ADMIN_REFRESH_COOKIE)?.value;

  // Khách đóng tab thì hủy luồng tới BE
  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort());

  let upstream = await openStream(accessToken, controller.signal);
  if (!upstream) {
    return NextResponse.json(
      { message: "Không kết nối được máy chủ" },
      { status: 503 },
    );
  }

  let renewed: BackendTokens | null = null;
  // Access token hết hạn: làm mới rồi mở lại đúng một lần
  if (upstream.status === 401 && refreshToken) {
    renewed = await refreshBackendTokens(refreshToken);
    if (renewed) {
      upstream = await openStream(renewed.accessToken, controller.signal);
    }
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    const unauthorized = upstream?.status === 401;
    const res = NextResponse.json(
      { message: "Không mở được luồng realtime" },
      { status: unauthorized ? 401 : 502 },
    );
    if (unauthorized) clearAdminCookies(res);
    return res;
  }

  const response = new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
  if (renewed) applyAdminCookies(response, renewed);
  return response;
}

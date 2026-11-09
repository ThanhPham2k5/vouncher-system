import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/cookies";
import {
  applyAdminCookies,
  clearAdminCookies,
  refreshBackendTokens,
  type BackendTokens,
} from "@/lib/admin-session";

// Chỉ chuyển tiếp các đường dẫn BE đã có. Các đường dẫn khác trả 404.
const ALLOWED_PATHS: RegExp[] = [
  /^fraud-logs(\/\d+)?$/,
  /^black-lists(\/\d+)?$/,
  /^rate-limit-configs(\/\d+)?$/,
  /^redemptions\/logs(\/\d+)?$/,
  /^rule\/(rewards|conditions)(\/\d+)?$/,
  /^rule\/metadata$/,
  /^campaigns(\/\d+)?$/,
  /^voucher-batches(\/\d+)?$/,
  /^batch-rules(\/\d+)?$/,
  /^distributions(\/logs\/\d+)?$/,
  /^statistic\/campaigns\/\d+\/(redemption-rate|incremental-revenue)$/,
  /^vouchers(\/\d+|\/code\/[^/]+)?$/,
  /^vouchers\/customer(\/\d+)?$/,
];

type RouteContext = { params: Promise<{ path: string[] }> };

async function callBackend(
  path: string,
  search: string,
  method: string,
  body: string | undefined,
  token: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${BACKEND_URL}/${path}${search}`, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return new Response(
      JSON.stringify({ message: "Không kết nối được máy chủ" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function forward(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  const subPath = path.join("/");
  if (!ALLOWED_PATHS.some((re) => re.test(subPath))) {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }

  const search = new URL(req.url).search;
  const body = req.method === "GET" ? undefined : await req.text();
  const store = await cookies();
  const accessToken = store.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(ADMIN_REFRESH_COOKIE)?.value;

  let upstream = await callBackend(
    subPath,
    search,
    req.method,
    body,
    accessToken,
  );
  let renewed: BackendTokens | null = null;

  // Access token hết hạn: thử làm mới bằng refresh token rồi gọi lại đúng một lần
  if (upstream.status === 401 && refreshToken) {
    renewed = await refreshBackendTokens(refreshToken);
    if (renewed) {
      upstream = await callBackend(
        subPath,
        search,
        req.method,
        body,
        renewed.accessToken,
      );
    }
  }

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
  if (renewed) applyAdminCookies(response, renewed);
  else if (upstream.status === 401) clearAdminCookies(response);
  return response;
}

export async function GET(req: Request, ctx: RouteContext) {
  return forward(req, ctx);
}

export async function POST(req: Request, ctx: RouteContext) {
  return forward(req, ctx);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  return forward(req, ctx);
}

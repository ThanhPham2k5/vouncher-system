import { BACKEND_URL } from "@/lib/config";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";
import { customerIdOf, segmentsOfCustomerId } from "@/lib/store-customers";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Mã thiết bị ổn định cho trình duyệt, BE dùng để chặn gian lận theo thiết bị
const DEVICE_COOKIE = "pc_store_device";

interface RedeemBody {
  voucherCode?: string;
  cartSubtotal?: number;
  items?: { productId: string; quantity: number; unitPrice: number }[];
  deviceFingerprint?: string;
}

export async function POST(req: Request) {
  const store = await cookies();
  const customerId = customerIdOf(store.get(STORE_SESSION_COOKIE)?.value);
  if (!customerId) {
    return NextResponse.json(
      { message: "Vui lòng đăng nhập" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as RedeemBody | null;
  if (
    !body?.voucherCode ||
    typeof body.cartSubtotal !== "number" ||
    !Array.isArray(body.items)
  ) {
    return NextResponse.json(
      { message: "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const existingDevice = store.get(DEVICE_COOKIE)?.value;
  const clientFingerprint =
    typeof body.deviceFingerprint === "string" &&
    /^[A-Za-z0-9_-]{8,128}$/.test(body.deviceFingerprint)
      ? body.deviceFingerprint
      : null;
  const deviceId = clientFingerprint ?? existingDevice ?? randomUUID();
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/redemptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Fingerprint": deviceId,
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      body: JSON.stringify({
        voucherCode: body.voucherCode,
        customerId,
        // Phân khúc lấy từ session phía server, không tin giá trị do client gửi lên
        customerSegments: segmentsOfCustomerId(customerId),
        cartSubtotal: body.cartSubtotal,
        items: body.items,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Không kết nối được máy chủ" },
      { status: 503 },
    );
  }

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
  if (!existingDevice) {
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

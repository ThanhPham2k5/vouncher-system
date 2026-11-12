// Gọi API admin qua BFF (/api/admin/...). Token nằm trong cookie httpOnly nên FE không đọc được.
// BE trả ApiResponse { status, message, data }; hàm này trả về data và ném ApiError khi lỗi.
import { ApiError } from "./common";

interface BackendEnvelope<T> {
  status?: number;
  message?: string;
  data?: T;
}

type Query = Record<string, string | number | boolean | undefined>;

export async function adminRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Query;
  } = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const hasBody = options.body !== undefined;

  let res: Response;
  try {
    res = await fetch(`/api/admin/${path}${suffix}`, {
      method: options.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 503);
  }

  const payload = (await res
    .json()
    .catch(() => null)) as BackendEnvelope<T> | null;
  if (!res.ok) {
    throw new ApiError(payload?.message ?? "Có lỗi xảy ra", res.status);
  }
  return payload?.data as T;
}

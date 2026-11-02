// Tiện ích dùng chung cho các mock API.
// Lỗi dùng ApiError với status giống BE, message tiếng Việt để FE hiển thị trực tiếp.

export function wait(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function badRequest(message: string): never {
  throw new ApiError(message, 400);
}

export function unauthorized(message: string): never {
  throw new ApiError(message, 401);
}

export function notFound(what: string): never {
  throw new ApiError(`Không tìm thấy ${what}`, 404);
}

// Id mới = max + 1, giống cách mock các bảng khác
export function nextId(ids: number[]): number {
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

// BE nhận config là object JSON (JsonNode). Từ chối mảng, chuỗi hoặc null.
export function assertJsonConfig(config: unknown): void {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    badRequest("config phải là object JSON");
  }
}

export function parseConfig(config: unknown): Record<string, unknown> {
  if (typeof config === "object" && config !== null && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

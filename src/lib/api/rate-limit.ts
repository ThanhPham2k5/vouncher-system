// BE: GET/POST /rate-limit-configs, GET/PATCH /rate-limit-configs/{id}.
// Request dùng limitScope, response dùng scope. BE không có tham số lọc nên lọc ở client.
import type {
  LimitScope,
  RateLimitConfigCreateRequest,
  RateLimitConfigResponse,
  RateLimitConfigUpdateRequest,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

export interface RateLimitConfigFilter {
  limitScope?: LimitScope;
  isActive?: boolean;
}

export async function listRateLimitConfigs(
  filter: RateLimitConfigFilter = {},
): Promise<RateLimitConfigResponse[]> {
  const all =
    await adminRequest<RateLimitConfigResponse[]>("rate-limit-configs");
  return all.filter(
    (c) =>
      (filter.limitScope === undefined || c.scope === filter.limitScope) &&
      (filter.isActive === undefined || c.isActive === filter.isActive),
  );
}

export function getRateLimitConfig(
  id: number,
): Promise<RateLimitConfigResponse> {
  return adminRequest<RateLimitConfigResponse>(`rate-limit-configs/${id}`);
}

export function createRateLimitConfig(
  req: RateLimitConfigCreateRequest,
): Promise<RateLimitConfigResponse> {
  return adminRequest<RateLimitConfigResponse>("rate-limit-configs", {
    method: "POST",
    body: req,
  });
}

// BE dùng JsonNullable: chỉ gửi các trường cần đổi (JSON.stringify bỏ trường undefined)
export function updateRateLimitConfig(
  id: number,
  req: RateLimitConfigUpdateRequest,
): Promise<RateLimitConfigResponse> {
  return adminRequest<RateLimitConfigResponse>(`rate-limit-configs/${id}`, {
    method: "PATCH",
    body: req,
  });
}

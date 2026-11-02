// Mock theo spec "Rate Limit": /rate-limit-configs.
// Request dùng limitScope, response dùng scope. Mock lưu theo response.
import type {
  LimitScope,
  RateLimitConfigCreateRequest,
  RateLimitConfigResponse,
  RateLimitConfigUpdateRequest,
} from "@/lib/campaigns/be-types";
import { badRequest, clone, nextId, notFound, nowIso, wait } from "./common";

let configs: RateLimitConfigResponse[] = [
  {
    id: 1,
    name: "Giới hạn đổi mã theo khách hàng",
    endpointPattern: "/api/v1/redemptions",
    scope: "CUSTOMER_ID",
    maxRequest: 5,
    timeWindowSeconds: 60,
    actionOnExceed: "REJECT_429",
    priority: 1,
    isActive: true,
    createAt: "2025-10-01T09:00:00Z",
  },
  {
    id: 2,
    name: "Chống brute-force đăng nhập",
    endpointPattern: "/auth/login",
    scope: "IP",
    maxRequest: 10,
    timeWindowSeconds: 300,
    actionOnExceed: "BLACKLIST",
    priority: 2,
    isActive: true,
    createAt: "2025-10-02T09:00:00Z",
  },
  {
    id: 3,
    name: "Giới hạn theo thiết bị",
    endpointPattern: "/api/v1/redemptions",
    scope: "DEVICE_FINGERPRINT",
    maxRequest: 3,
    timeWindowSeconds: 60,
    actionOnExceed: "REJECT_429",
    priority: 3,
    isActive: false,
    createAt: "2025-10-03T09:00:00Z",
  },
];

function assertLimits(
  maxRequest?: number,
  timeWindowSeconds?: number,
  priority?: number,
): void {
  if (
    maxRequest !== undefined &&
    (!Number.isInteger(maxRequest) || maxRequest < 1)
  ) {
    badRequest("maxRequest phải là số nguyên từ 1 trở lên");
  }
  if (
    timeWindowSeconds !== undefined &&
    (!Number.isInteger(timeWindowSeconds) || timeWindowSeconds < 1)
  ) {
    badRequest("timeWindowSeconds phải là số nguyên từ 1 trở lên");
  }
  if (priority !== undefined && !Number.isInteger(priority)) {
    badRequest("priority phải là số nguyên");
  }
}

export interface RateLimitConfigFilter {
  limitScope?: LimitScope;
  isActive?: boolean;
}

export async function listRateLimitConfigs(
  filter: RateLimitConfigFilter = {},
): Promise<RateLimitConfigResponse[]> {
  await wait(300);
  return clone(
    configs.filter(
      (c) =>
        (filter.limitScope === undefined || c.scope === filter.limitScope) &&
        (filter.isActive === undefined || c.isActive === filter.isActive),
    ),
  );
}

export async function getRateLimitConfig(
  id: number,
): Promise<RateLimitConfigResponse> {
  await wait(200);
  const found = configs.find((c) => c.id === id);
  if (!found) notFound("cấu hình rate limit");
  return clone(found);
}

export async function createRateLimitConfig(
  req: RateLimitConfigCreateRequest,
): Promise<RateLimitConfigResponse> {
  await wait();
  if (!req.name.trim()) badRequest("name không được để trống");
  assertLimits(req.maxRequest, req.timeWindowSeconds, req.priority);
  const created: RateLimitConfigResponse = {
    id: nextId(configs.map((c) => c.id)),
    name: req.name.trim(),
    endpointPattern: req.endpointPattern,
    scope: req.limitScope,
    maxRequest: req.maxRequest,
    timeWindowSeconds: req.timeWindowSeconds,
    actionOnExceed: req.actionOnExceed,
    priority: req.priority,
    isActive: true,
    createAt: nowIso(),
  };
  configs = [...configs, created];
  return clone(created);
}

export async function updateRateLimitConfig(
  id: number,
  req: RateLimitConfigUpdateRequest,
): Promise<RateLimitConfigResponse> {
  await wait();
  const existing = configs.find((c) => c.id === id);
  if (!existing) notFound("cấu hình rate limit");
  assertLimits(req.maxRequest, req.timeWindowSeconds, req.priority);
  const updated: RateLimitConfigResponse = {
    ...existing,
    name: req.name?.trim() ?? existing.name,
    endpointPattern: req.endpointPattern ?? existing.endpointPattern,
    scope: req.limitScope ?? existing.scope,
    maxRequest: req.maxRequest ?? existing.maxRequest,
    timeWindowSeconds: req.timeWindowSeconds ?? existing.timeWindowSeconds,
    actionOnExceed: req.actionOnExceed ?? existing.actionOnExceed,
    priority: req.priority ?? existing.priority,
    isActive: req.isActive ?? existing.isActive,
  };
  configs = configs.map((c) => (c.id === id ? updated : c));
  return clone(updated);
}

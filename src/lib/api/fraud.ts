// BE: GET/POST /fraud-logs, GET /fraud-logs/{id}; GET/POST /black-lists, GET /black-lists/{id},
// PATCH /black-lists/{id} (chỉ vô hiệu hóa, không nhận body).
// BE không có tham số lọc trên list, nên lọc ở client.
import type {
  BlackListCreateRequest,
  BlackListResponse,
  BlacklistType,
  FraudLogCreateRequest,
  FraudLogResponse,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

// ---- Fraud logs ----
export interface FraudLogFilter {
  customerId?: string;
  voucherId?: number;
}

export async function listFraudLogs(
  filter: FraudLogFilter = {},
): Promise<FraudLogResponse[]> {
  const all = await adminRequest<FraudLogResponse[]>("fraud-logs");
  return all.filter(
    (f) =>
      (filter.customerId === undefined || f.customerId === filter.customerId) &&
      (filter.voucherId === undefined || f.voucherId === filter.voucherId),
  );
}

export function getFraudLog(id: number): Promise<FraudLogResponse> {
  return adminRequest<FraudLogResponse>(`fraud-logs/${id}`);
}

export function createFraudLog(
  req: FraudLogCreateRequest,
): Promise<FraudLogResponse> {
  return adminRequest<FraudLogResponse>("fraud-logs", {
    method: "POST",
    body: req,
  });
}

// ---- Blacklist ----
export interface BlacklistFilter {
  type?: BlacklistType;
  value?: string;
}

export async function listBlacklist(
  filter: BlacklistFilter = {},
): Promise<BlackListResponse[]> {
  const all = await adminRequest<BlackListResponse[]>("black-lists");
  return all.filter(
    (b) =>
      (filter.type === undefined || b.type === filter.type) &&
      (filter.value === undefined || b.value === filter.value),
  );
}

export function getBlacklist(id: number): Promise<BlackListResponse> {
  return adminRequest<BlackListResponse>(`black-lists/${id}`);
}

export function createBlacklist(
  req: BlackListCreateRequest,
): Promise<BlackListResponse> {
  return adminRequest<BlackListResponse>("black-lists", {
    method: "POST",
    body: req,
  });
}

// BE: PATCH /black-lists/{id} chỉ đặt isActive = false
export function deactivateBlacklist(id: number): Promise<BlackListResponse> {
  return adminRequest<BlackListResponse>(`black-lists/${id}`, {
    method: "PATCH",
  });
}

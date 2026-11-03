// BE: GET /redemptions/logs, GET /redemptions/logs/{id} (cần đăng nhập).
// POST /redemptions là API công khai cho storefront, chưa được nối ở đây.
import type { RedemptionLogResponse } from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

// Bản đã tải gần nhất, dùng cho thống kê (statistics.ts). Rỗng cho đến khi listRedemptionLogs được gọi.
let snapshot: RedemptionLogResponse[] = [];

export interface RedemptionLogFilter {
  customerId?: string;
  voucherId?: number;
}

export async function listRedemptionLogs(
  filter: RedemptionLogFilter = {},
): Promise<RedemptionLogResponse[]> {
  const all = await adminRequest<RedemptionLogResponse[]>("redemptions/logs");
  snapshot = all;
  return all.filter(
    (l) =>
      (filter.customerId === undefined || l.customerId === filter.customerId) &&
      (filter.voucherId === undefined || l.voucherId === filter.voucherId),
  );
}

export function getRedemptionLog(id: number): Promise<RedemptionLogResponse> {
  return adminRequest<RedemptionLogResponse>(`redemptions/logs/${id}`);
}

export function getRedemptionsSnapshot(): RedemptionLogResponse[] {
  return snapshot;
}

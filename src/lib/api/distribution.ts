// BE: GET /distributions (lọc voucher_id, campaign_id, status), POST /distributions,
// GET /distributions/logs/{id}.
import type {
  DistributionLogCreateRequest,
  DistributionLogResponse,
  DistributionStatus,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

// BE trả thêm campaignId, be-types chưa khai báo trường này
export interface DistributionLog extends DistributionLogResponse {
  campaignId: number;
}

export interface DistributionLogFilter {
  voucherId?: number;
  campaignId?: number;
  status?: DistributionStatus;
}

export function listDistributionLogs(
  filter: DistributionLogFilter = {},
): Promise<DistributionLog[]> {
  return adminRequest<DistributionLog[]>("distributions", {
    query: {
      voucher_id: filter.voucherId,
      campaign_id: filter.campaignId,
      status: filter.status,
    },
  });
}

export function getDistributionLog(id: number): Promise<DistributionLog> {
  return adminRequest<DistributionLog>(`distributions/logs/${id}`);
}

// BE trả PENDING/SENT/FAILED ngay khi nhận yêu cầu, không cần giả lập trễ ở FE
export function createDistributionLog(
  req: DistributionLogCreateRequest,
): Promise<DistributionLog> {
  return adminRequest<DistributionLog>("distributions", {
    method: "POST",
    body: req,
  });
}

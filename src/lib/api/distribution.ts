// Mock theo BE + spec "Distribution Logs".
// BE hiện chỉ có service GET all/GET by id (chưa có controller); POST theo spec là /distributitions (spec gõ sai).
// Response theo BE: không có campaignId, sentAt luôn có giá trị. Chiến dịch suy ra từ voucher.
import { findVoucherBatch } from "@/lib/campaigns/service";
import type {
  DistributionChannel,
  DistributionLogCreateRequest,
  DistributionLogResponse,
  DistributionStatus,
} from "@/lib/campaigns/be-types";
import { badRequest, clone, nextId, notFound, nowIso, wait } from "./common";
import { firstVoucherOfBatch, getVouchersSnapshot } from "./vouchers";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function seedLogs(): DistributionLogResponse[] {
  return getVouchersSnapshot()
    .slice(0, 3)
    .map(
      (v, i): DistributionLogResponse => ({
        id: i + 1,
        voucherId: v.id,
        channel: i === 1 ? "WEBHOOK" : "EMAIL",
        targetAddress:
          i === 1
            ? "https://api.merchant.vn/webhooks/promo"
            : `khach${i + 1}@example.com`,
        status: i === 1 ? "FAILED" : "SENT",
        sentAt: "2025-10-24T10:00:00Z",
      }),
    );
}

let logs: DistributionLogResponse[] = seedLogs();

function campaignOfVoucher(voucherId: number): number | undefined {
  return getVouchersSnapshot().find((v) => v.id === voucherId)?.campaignId;
}

function isValidTarget(channel: DistributionChannel, target: string): boolean {
  if (channel === "EMAIL") return EMAIL_PATTERN.test(target);
  return target.startsWith("https://");
}

export interface DistributionLogFilter {
  voucherId?: number;
  campaignId?: number;
  status?: DistributionStatus;
}

export async function listDistributionLogs(
  filter: DistributionLogFilter = {},
): Promise<DistributionLogResponse[]> {
  await wait(300);
  return clone(
    logs.filter(
      (l) =>
        (filter.voucherId === undefined || l.voucherId === filter.voucherId) &&
        (filter.campaignId === undefined ||
          campaignOfVoucher(l.voucherId) === filter.campaignId) &&
        (filter.status === undefined || l.status === filter.status),
    ),
  );
}

export async function getDistributionLog(
  id: number,
): Promise<DistributionLogResponse> {
  await wait(200);
  const found = logs.find((l) => l.id === id);
  if (!found) notFound("nhật ký phân phối");
  return clone(found);
}

// Spec: ghi nhận một yêu cầu gửi mã. Trả về PENDING, mock chuyển sang SENT sau 2 giây.
export async function createDistributionLog(
  req: DistributionLogCreateRequest,
): Promise<DistributionLogResponse> {
  await wait();
  const batch = findVoucherBatch(req.batchId);
  if (!batch) notFound("lô mã");
  if (batch.campaignId !== req.campaignId) {
    badRequest("Lô mã không thuộc chiến dịch đã chọn");
  }
  const voucher = firstVoucherOfBatch(batch.id);
  if (!voucher) badRequest("Lô mã chưa có voucher nào");
  if (!isValidTarget(req.channel, req.targetAddress)) {
    badRequest(
      req.channel === "EMAIL"
        ? "Địa chỉ email không hợp lệ"
        : "Webhook URL phải bắt đầu bằng https://",
    );
  }

  const created: DistributionLogResponse = {
    id: nextId(logs.map((l) => l.id)),
    voucherId: voucher.id,
    channel: req.channel,
    targetAddress: req.targetAddress,
    status: "PENDING",
    sentAt: nowIso(),
  };
  logs = [...logs, created];

  setTimeout(() => {
    logs = logs.map((l) =>
      l.id === created.id ? { ...l, status: "SENT" } : l,
    );
  }, 2000);

  return clone(created);
}

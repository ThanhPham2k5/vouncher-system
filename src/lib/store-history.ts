// Lịch sử áp mã của khách lấy từ BE (GET /redemptions/logs, lọc theo customerId).
// LƯU Ý: endpoint này hiện là API admin (qua /api/admin), khách hàng chưa có quyền gọi.
import { listRedemptionLogs } from "@/lib/api/redemptions";
import { listVouchers } from "@/lib/api/vouchers";
import { describeVouchers } from "@/lib/store-claimable-vouchers";

export interface RedemptionRecord {
  id: string;
  code: string;
  campaignTitle: string;
  headline: string; // tóm tắt phần thưởng của voucher
  conditions: string[]; // đầy đủ các điều kiện của voucher
  originalAmount: number;
  discountAmount: number; // 0 khi thất bại
  status: "SUCCESS" | "BLOCKED";
  blockedReason?: string;
  appliedAt: string; // ISO
  transactionRef: string;
  voucherId: number;
  finalAmount: number;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  failureReason: string | null;
}

export async function listStoreHistory(
  customerId: string | null,
): Promise<RedemptionRecord[]> {
  if (!customerId) return [];

  const [logs, vouchers] = await Promise.all([
    listRedemptionLogs({ customerId }),
    listVouchers(),
  ]);
  const voucherById = new Map(vouchers.map((v) => [v.id, v]));
  const usedVouchers = vouchers.filter((v) =>
    logs.some((l) => l.voucherId === v.id),
  );
  const infos = describeVouchers(usedVouchers);
  const infoByVoucherId = new Map(infos.map((i) => [i.voucherId, i]));

  return [...logs]
    .sort((a, b) => Date.parse(b.createAt) - Date.parse(a.createAt))
    .map((l) => {
      const info = infoByVoucherId.get(l.voucherId);
      return {
        id: String(l.id),
        code: voucherById.get(l.voucherId)?.code ?? `#${l.voucherId}`,
        campaignTitle: info?.title ?? "",
        headline: info?.headline ?? "",
        conditions: info?.conditions ?? [],
        originalAmount: l.originalAmount,
        discountAmount: l.discountAmount,
        status: l.status === "SUCCESS" ? "SUCCESS" : "BLOCKED",
        blockedReason: l.failureReason ?? undefined,
        appliedAt: l.createAt,
        transactionRef: `LOG_REDEMPTION_${l.id}`,
        voucherId: l.voucherId,
        finalAmount: l.finalAmount,
        ipAddress: l.ipAddress,
        deviceFingerprint: l.deviceFingerprint,
        failureReason: l.failureReason,
      };
    });
}

// Thông tin ưu đãi của voucher, lấy từ GET vouchers.
// VoucherResponse đã có đủ campaign, batch, reward và condition nên không gọi thêm API nào.
// LƯU Ý: endpoint này hiện là API admin (qua /api/admin, cần phiên admin).
// Khách hàng chưa có quyền gọi. Cần BE mở endpoint công khai cho store.
import { summarizeConfig } from "@/components/rules/rule-config";
import { listVouchers } from "@/lib/api/vouchers";
import type {
  BatchType,
  ConditionType,
  JsonObject,
  RewardType,
  VoucherResponse,
} from "@/lib/campaigns/be-types";

export type ClaimKind = "PERCENT" | "FIXED" | "GIFT" | "TIERED";

export const CLAIM_KIND_LABEL: Record<ClaimKind, string> = {
  PERCENT: "Giảm phần trăm %",
  FIXED: "Giảm trực tiếp",
  GIFT: "Tặng quà",
  TIERED: "Chiết khấu theo bậc",
};

const KIND_OF_REWARD: Record<RewardType, ClaimKind> = {
  PERCENTAGE: "PERCENT",
  FIXED: "FIXED",
  BUY_X_GET_Y: "GIFT",
  TIERED_PERCENTAGE: "TIERED",
};

export interface ClaimableVoucher {
  code: string;
  voucherId: number;
  expiresAt: string;
  batchType: BatchType;
  kind: ClaimKind;
  title: string; // tên phần thưởng
  subtitle: string; // tên điều kiện
  headline: string; // tóm tắt phần thưởng
  conditions: string[]; // đầy đủ các điều kiện, mỗi dòng một ý
}

const money = (value: unknown): string =>
  `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;

const clock = (value: unknown): string => String(value ?? "").slice(0, 5);

// Mô tả đầy đủ một điều kiện thành các dòng. COMPOSITE mô tả từng điều kiện con.
export function describeCondition(
  type: ConditionType,
  config: JsonObject,
): string[] {
  switch (type) {
    case "MIN_CART_AMOUNT":
      return [`Đơn hàng tối thiểu ${money(config.minimumAmount)}`];
    case "TIME_WINDOW": {
      const windows = Array.isArray(config.windows) ? config.windows : [];
      const ranges = windows
        .map((w) => `${clock(w.startTime)} - ${clock(w.endTime)}`)
        .join(", ");
      return [`Áp dụng khung giờ: ${ranges || "—"}`];
    }
    case "CUSTOMER_SEGMENT": {
      const segments = Array.isArray(config.segments) ? config.segments : [];
      const op =
        config.operator === "NOT_IN" ? "Không thuộc nhóm" : "Thuộc nhóm";
      return [`Khách hàng ${op}: ${segments.join(", ") || "—"}`];
    }
    case "COMPOSITE": {
      const subs = Array.isArray(config.conditions) ? config.conditions : [];
      const join = config.operator === "OR" ? "một trong các" : "tất cả các";
      const lines = [`Thỏa ${join} điều kiện sau:`];
      for (const sub of subs) {
        const subType = String(sub.type ?? "") as ConditionType;
        const subConfig = (sub.config ?? {}) as JsonObject;
        for (const line of describeCondition(subType, subConfig)) {
          lines.push(`• ${line}`);
        }
      }
      return lines;
    }
    default:
      return [];
  }
}

// Ghép thông tin hiển thị từ danh sách VoucherResponse, không gọi API
export function describeVouchers(
  vouchers: VoucherResponse[],
): ClaimableVoucher[] {
  return vouchers.map((v) => ({
    code: v.code,
    voucherId: v.id,
    expiresAt: v.campaign.endTime,
    batchType: v.batch.batchType,
    kind: KIND_OF_REWARD[v.reward.type as RewardType],
    title: v.reward.name,
    subtitle: v.condition.name,
    headline: summarizeConfig(
      "REWARD",
      v.reward.type,
      (v.reward.config ?? {}) as JsonObject,
    ),
    conditions: describeCondition(
      v.condition.type as ConditionType,
      (v.condition.config ?? {}) as JsonObject,
    ),
  }));
}

// Trang săn mã: một lần gọi GET vouchers.
// Chỉ lấy voucher thuộc chiến dịch ACTIVE, lô GENERIC và lô chưa hết lượt.
export async function listClaimableVouchers(): Promise<ClaimableVoucher[]> {
  const vouchers = await listVouchers();
  const eligible = vouchers.filter(
    (v) =>
      v.campaign.status === "ACTIVE" &&
      v.batch.batchType === "GENERIC" &&
      v.batch.redeemedCount < v.batch.maxUsageCount,
  );
  return describeVouchers(eligible);
}

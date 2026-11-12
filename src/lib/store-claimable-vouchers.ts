// Thông tin ưu đãi của voucher, lấy từ API thật.
// Ghép theo chuỗi: voucher → lô → quy tắc lô → phần thưởng và điều kiện.
// LƯU Ý: các endpoint này hiện là API admin (qua /api/admin, cần phiên admin).
// Khách hàng chưa có quyền gọi. Cần BE mở endpoint công khai cho store.
import { summarizeConfig } from "@/components/rules/rule-config";
import {
  listBatchRules,
  listConditions,
  listRewards,
} from "@/lib/api/rule-engine";
import { listVoucherBatches } from "@/lib/api/voucher-batches";
import { listVouchers } from "@/lib/api/vouchers";
import { listCampaigns } from "@/lib/campaigns/service";
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

// Ghép thông tin cho danh sách voucher bất kỳ, không lọc theo chiến dịch hay loại lô
export async function describeVouchers(
  vouchers: VoucherResponse[],
): Promise<ClaimableVoucher[]> {
  if (vouchers.length === 0) return [];

  const [batches, batchRules, rewards, conditions] = await Promise.all([
    listVoucherBatches(),
    listBatchRules(),
    listRewards(),
    listConditions(),
  ]);

  const batchById = new Map(batches.map((b) => [b.id, b]));
  const ruleById = new Map(batchRules.map((r) => [r.id, r]));
  const rewardById = new Map(rewards.map((r) => [r.id, r]));
  const conditionById = new Map(conditions.map((c) => [c.id, c]));

  return vouchers.flatMap((v) => {
    const batch = batchById.get(v.batchId);
    if (!batch) return [];

    const rule = ruleById.get(batch.ruleId);
    const reward = rule ? rewardById.get(rule.rewardId) : undefined;
    const condition = rule ? conditionById.get(rule.conditionId) : undefined;
    if (!reward || !condition) return [];

    return [
      {
        code: v.code,
        voucherId: v.id,
        batchType: batch.batchType,
        kind: KIND_OF_REWARD[reward.rewardType],
        title: reward.name,
        subtitle: condition.name,
        headline: summarizeConfig("REWARD", reward.rewardType, reward.config),
        conditions: describeCondition(
          condition.conditionType,
          condition.config,
        ),
      },
    ];
  });
}

// Trang săn mã: chỉ voucher thuộc chiến dịch ACTIVE và lô GENERIC
export async function listClaimableVouchers(): Promise<ClaimableVoucher[]> {
  const [vouchers, campaigns, batches] = await Promise.all([
    listVouchers(),
    listCampaigns(),
    listVoucherBatches(),
  ]);
  const activeCampaignIds = new Set(
    campaigns.filter((c) => c.status === "ACTIVE").map((c) => c.id),
  );
  const eligible = vouchers.filter((v) => activeCampaignIds.has(v.campaignId));

  // Lô đã dùng hết lượt (redeemedCount >= maxUsageCount) thì ẩn khỏi trang săn mã
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const exhaustedVoucherIds = new Set(
    eligible
      .filter((v) => {
        const batch = batchById.get(v.batchId);
        return !!batch && batch.redeemedCount >= batch.maxUsageCount;
      })
      .map((v) => v.id),
  );

  const infos = await describeVouchers(eligible);
  return infos.filter(
    (i) => i.batchType === "GENERIC" && !exhaustedVoucherIds.has(i.voucherId),
  );
}

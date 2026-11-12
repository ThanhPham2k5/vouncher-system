// Quy tắc thật của các mã trong kho khách (voucher → lô → quy tắc lô → phần thưởng và điều kiện)
// và tính thử số tiền giảm ở client. Số tiền chính thức do BE trả về khi đặt hàng.
import { summarizeConfig } from "@/components/rules/rule-config";
import {
  listBatchRules,
  listConditions,
  listRewards,
} from "@/lib/api/rule-engine";
import { listVoucherBatches } from "@/lib/api/voucher-batches";
import { listVouchers } from "@/lib/api/vouchers";
import type { ConditionType, RewardType } from "@/lib/campaigns/be-types";
import type { CartItem } from "@/lib/store-cart";
import { formatVnd } from "@/lib/store-checkout";
import { describeCondition } from "@/lib/store-claimable-vouchers";

type Config = Record<string, unknown>;

export interface WalletRule {
  code: string;
  rewardName: string;
  rewardType: RewardType;
  rewardConfig: Config;
  conditionType: ConditionType;
  conditionConfig: Config;
  headline: string;
  conditionName: string;
  conditionLines: string[]; // mô tả đầy đủ từng điều kiện, kể cả điều kiện con của COMPOSITE
  condition: string;
}

// Thông tin mua X tặng Y, luôn có để hiển thị cả khi chưa đủ điều kiện
export interface BuyGetInfo {
  buyProductIds: string[];
  buyQuantity: number;
  getProductIds: string[];
  getQuantity: number;
  discountPercent: number;
  eligibleBuy: number; // số lượng nhóm mua có trong giỏ
  applications: number; // số lần áp dụng
  unitsRewarded: number; // số sản phẩm tặng thực sự được áp ưu đãi
  discount: number;
}

export interface WalletPreview {
  // true: đủ điều kiện, null: có điều kiện chỉ BE kiểm tra được, false: không đủ điều kiện
  applicable: boolean | null;
  discount: number;
  reason?: string; // luôn bắt đầu bằng "Không đủ điều kiện:" khi applicable = false
  buyGet?: BuyGetInfo;
}

const n = (c: Config, key: string): number => Number(c[key] ?? 0);

// Lấy quy tắc của các voucher khách đang có
export async function loadWalletRules(
  voucherIds: Set<number>,
): Promise<WalletRule[]> {
  if (voucherIds.size === 0) return [];
  const [vouchers, batches, batchRules, rewards, conditions] =
    await Promise.all([
      listVouchers(),
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
    if (!voucherIds.has(v.id)) return [];
    const batch = batchById.get(v.batchId);
    const rule = batch ? ruleById.get(batch.ruleId) : undefined;
    const reward = rule ? rewardById.get(rule.rewardId) : undefined;
    const condition = rule ? conditionById.get(rule.conditionId) : undefined;
    if (!reward || !condition) return [];

    return [
      {
        code: v.code,
        rewardName: reward.name,
        rewardType: reward.rewardType,
        rewardConfig: reward.config as Config,
        conditionType: condition.conditionType,
        conditionConfig: condition.config as Config,
        conditionName: condition.name,
        conditionLines: describeCondition(
          condition.conditionType,
          condition.config,
        ),
        headline: summarizeConfig("REWARD", reward.rewardType, reward.config),
        condition: summarizeConfig(
          "CONDITION",
          condition.conditionType,
          condition.config,
        ),
      },
    ];
  });
}

type Check = { ok: boolean; reason?: string } | null;

// Số giây kể từ 00:00 của thời điểm hiện tại theo múi giờ của quy tắc
function nowSecondsIn(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}

// "HH:mm" hoặc "HH:mm:ss" thành số giây kể từ 00:00
function toSeconds(time: string): number {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// Khung [start, end), hỗ trợ khung qua nửa đêm (ví dụ 22:00 - 02:00)
function inWindow(now: number, start: number, end: number): boolean {
  return start < end ? now >= start && now < end : now >= start || now < end;
}

// null: client không kiểm tra được (múi giờ không hợp lệ hoặc loại điều kiện chưa hỗ trợ), để BE quyết định
function checkCondition(
  type: ConditionType,
  config: Config,
  subtotal: number,
  segments: string[],
): Check {
  if (type === "MIN_CART_AMOUNT") {
    const min = n(config, "minimumAmount");
    return subtotal >= min
      ? { ok: true }
      : {
          ok: false,
          reason: `Không đủ điều kiện: đơn tối thiểu ${formatVnd(min)}`,
        };
  }
  if (type === "TIME_WINDOW") {
    const timezone = String(config.timezone ?? "");
    const windows = (config.windows ?? []) as {
      startTime: string;
      endTime: string;
    }[];
    let now: number;
    try {
      now = nowSecondsIn(timezone);
    } catch {
      // Múi giờ không hợp lệ ở client: để BE kiểm tra
      return null;
    }
    const matched = windows.some((w) =>
      inWindow(now, toSeconds(w.startTime), toSeconds(w.endTime)),
    );
    if (matched) return { ok: true };
    const label = windows
      .map((w) => `${w.startTime.slice(0, 5)} - ${w.endTime.slice(0, 5)}`)
      .join(", ");
    return {
      ok: false,
      reason: `Không đủ điều kiện: mã chỉ áp dụng trong khung giờ ${label}`,
    };
  }
  if (type === "CUSTOMER_SEGMENT") {
    const target = (config.segments ?? []) as string[];
    const matched = segments.some((s) => target.includes(s));
    const isIn = config.operator !== "NOT_IN";
    if (isIn ? matched : !matched) return { ok: true };
    return {
      ok: false,
      reason: isIn
        ? `Không đủ điều kiện: mã chỉ dành cho nhóm khách ${target.join(", ")}`
        : `Không đủ điều kiện: mã không áp dụng cho nhóm khách ${target.join(", ")}`,
    };
  }
  if (type === "COMPOSITE") {
    const children = (config.conditions ?? []) as {
      type: ConditionType;
      config: Config;
    }[];
    const results = children.map((c) =>
      checkCondition(c.type, c.config, subtotal, segments),
    );
    if (config.operator === "AND") {
      const fail = results.find((r) => r && !r.ok);
      if (fail) return fail;
      return results.every((r) => r?.ok) ? { ok: true } : null;
    }
    if (results.some((r) => r?.ok)) return { ok: true };
    if (results.length > 0 && results.every((r) => r && !r.ok)) {
      return {
        ok: false,
        reason: "Không đủ điều kiện: chưa đạt điều kiện nào trong nhóm",
      };
    }
    return null;
  }
  return null;
}

// Tính mua X tặng Y: nhóm mua và nhóm tặng lấy theo sản phẩm trong giỏ
export function computeBuyGet(
  config: Config,
  items: CartItem[],
  subtotal: number,
): BuyGetInfo {
  const buy = (config.buy ?? {}) as Config;
  const get = (config.get ?? {}) as Config;
  const buyProductIds = (buy.productIds ?? []) as string[];
  const getProductIds = (get.productIds ?? []) as string[];
  const buyIds = new Set(buyProductIds);
  const getIds = new Set(getProductIds);
  const buyQuantity = n(buy, "quantity");
  const getQuantity = n(get, "quantity");
  const discountPercent = n(get, "discountPercent");
  const eligibleBuy = items
    .filter((i) => buyIds.has(i.sku))
    .reduce((sum, i) => sum + i.quantity, 0);

  const base: BuyGetInfo = {
    buyProductIds,
    buyQuantity,
    getProductIds,
    getQuantity,
    discountPercent,
    eligibleBuy,
    applications: 0,
    unitsRewarded: 0,
    discount: 0,
  };
  if (buyQuantity <= 0 || getQuantity <= 0) return base;

  const applications = Math.min(
    Math.floor(eligibleBuy / buyQuantity),
    n(config, "maxApplicationsPerOrder"),
  );
  let remaining = applications * getQuantity;
  let discount = 0;
  let unitsRewarded = 0;
  // BE giảm trước các sản phẩm nhóm tặng có giá thấp nhất
  const getItems = items
    .filter((i) => getIds.has(i.sku))
    .sort((a, b) => a.price - b.price);
  for (const item of getItems) {
    if (remaining <= 0) break;
    const allocated = Math.min(item.quantity, remaining);
    discount += Math.floor((item.price * allocated * discountPercent) / 100);
    unitsRewarded += allocated;
    remaining -= allocated;
  }

  return {
    ...base,
    applications,
    unitsRewarded,
    discount: Math.min(subtotal, discount),
  };
}

// Các loại giảm theo tổng đơn (không cần sản phẩm trong giỏ)
function calcCartReward(
  type: RewardType,
  config: Config,
  subtotal: number,
): { discount: number; reason?: string } {
  if (type === "PERCENTAGE") {
    const calc = Math.floor((subtotal * n(config, "discountPercent")) / 100);
    return {
      discount: Math.min(subtotal, calc, n(config, "maxDiscountAmount")),
    };
  }

  if (type === "FIXED") {
    return { discount: Math.min(n(config, "discountValue"), subtotal) };
  }

  if (type === "TIERED_PERCENTAGE") {
    const tiers = (config.tiers ?? []) as Config[];
    let matched: Config | undefined;
    // BE yêu cầu tiers tăng dần theo minCartAmount, lấy bậc cao nhất đạt được
    for (const tier of tiers) {
      if (subtotal >= n(tier, "minCartAmount")) matched = tier;
      else break;
    }
    if (!matched) {
      const lowest = tiers[0] ? n(tiers[0], "minCartAmount") : 0;
      return {
        discount: 0,
        reason: `Không đủ điều kiện: đơn tối thiểu ${formatVnd(lowest)} để đạt bậc giảm`,
      };
    }
    const calc = Math.floor((subtotal * n(matched, "discountPercent")) / 100);
    return {
      discount: Math.min(subtotal, calc, n(matched, "maxDiscountAmount")),
    };
  }

  return { discount: 0, reason: "Loại phần thưởng này chưa xem trước được" };
}

export function previewWalletRule(
  rule: WalletRule,
  items: CartItem[],
  subtotal: number,
  customerSegments: string[] = [],
): WalletPreview {
  const buyGet =
    rule.rewardType === "BUY_X_GET_Y"
      ? computeBuyGet(rule.rewardConfig, items, subtotal)
      : undefined;

  const check = checkCondition(
    rule.conditionType,
    rule.conditionConfig,
    subtotal,
    customerSegments,
  );
  const unknown = check === null;

  if (check && !check.ok) {
    return { applicable: false, discount: 0, reason: check.reason, buyGet };
  }

  if (buyGet) {
    if (buyGet.eligibleBuy < buyGet.buyQuantity) {
      return {
        applicable: false,
        discount: 0,
        reason: `Không đủ điều kiện: cần ${buyGet.buyQuantity} sản phẩm trong nhóm mua (giỏ đang có ${buyGet.eligibleBuy})`,
        buyGet,
      };
    }
    if (buyGet.unitsRewarded === 0) {
      return {
        applicable: false,
        discount: 0,
        reason: "Không đủ điều kiện: giỏ chưa có sản phẩm thuộc nhóm được tặng",
        buyGet,
      };
    }
    return {
      applicable: unknown ? null : true,
      discount: buyGet.discount,
      buyGet,
    };
  }

  const calc = calcCartReward(rule.rewardType, rule.rewardConfig, subtotal);
  if (calc.reason) {
    return { applicable: false, discount: 0, reason: calc.reason };
  }
  return { applicable: unknown ? null : true, discount: calc.discount };
}

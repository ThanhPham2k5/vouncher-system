// Mock theo spec "Redemptions": /redemptions và /redemptions/logs.
// Logic giảm giá là bản rút gọn: hỗ trợ PERCENTAGE, FIXED và MIN_CART_AMOUNT. Các loại khác báo lỗi.
import { findVoucherBatch } from "@/lib/campaigns/service";
import type {
  LineDiscount,
  RedemptionLogResponse,
  RedemptionStatus,
  VoucherRedeemRequest,
  VoucherRedeemResponse,
} from "@/lib/campaigns/be-types";
import {
  ApiError,
  badRequest,
  clone,
  nextId,
  nowIso,
  parseConfig,
  wait,
} from "./common";
import { addFraudLog, isBlocked } from "./fraud";
import { findBatchRule, findCondition, findReward } from "./rule-engine";
import {
  findVoucherByCode,
  getVouchersSnapshot,
  getWalletEntry,
  setWalletStatus,
} from "./vouchers";

// Spec yêu cầu header X-Device-Fingerprint. IP mock cố định vì FE chưa có IP thật.
const MOCK_IP = "203.0.113.10";

function seedLogs(): RedemptionLogResponse[] {
  const v = getVouchersSnapshot();
  const first = v[0]?.id ?? 1;
  const second = v[1]?.id ?? 2;
  return [
    {
      id: 1,
      voucherId: first,
      customerId: "1",
      ipAddress: MOCK_IP,
      deviceFingerprint: "fp_ios_a17pro_9",
      originalAmount: 1_890_000,
      discountAmount: 378_000,
      finalAmount: 1_512_000,
      status: "SUCCESS",
      failureReason: null,
      createAt: "2025-10-24T14:28:10Z",
    },
    {
      id: 2,
      voucherId: second,
      customerId: "2",
      ipAddress: MOCK_IP,
      deviceFingerprint: "fp_arm_44c110",
      originalAmount: 650_000,
      discountAmount: 0,
      finalAmount: 650_000,
      status: "FAILED",
      failureReason: "Không đạt giá trị đơn tối thiểu",
      createAt: "2025-10-21T19:15:22Z",
    },
  ];
}

let logs: RedemptionLogResponse[] = seedLogs();

function buildLog(
  voucherId: number,
  customerId: number,
  subtotal: number,
  discount: number,
  status: RedemptionStatus,
  failureReason: string | null,
  deviceFingerprint: string,
): RedemptionLogResponse {
  const log: RedemptionLogResponse = {
    id: nextId(logs.map((l) => l.id)),
    voucherId,
    customerId: String(customerId),
    ipAddress: MOCK_IP,
    deviceFingerprint,
    originalAmount: subtotal,
    discountAmount: discount,
    finalAmount: subtotal - discount,
    status,
    failureReason,
    createAt: nowIso(),
  };
  logs = [...logs, log];
  return log;
}

// Trả về null nếu loại thưởng chưa được mock
function computeDiscount(
  rewardType: string,
  config: unknown,
  subtotal: number,
): number | null {
  const cfg = parseConfig(config);
  if (rewardType === "PERCENTAGE") {
    const raw = Math.floor((subtotal * Number(cfg.percent ?? 0)) / 100);
    const cap = cfg.maxAmount !== undefined ? Number(cfg.maxAmount) : raw;
    return Math.min(raw, cap);
  }
  if (rewardType === "FIXED") {
    return Math.min(Number(cfg.amount ?? 0), subtotal);
  }
  return null;
}

export interface RedemptionLogFilter {
  customerId?: number;
  voucherId?: number;
}

export async function listRedemptionLogs(
  filter: RedemptionLogFilter = {},
): Promise<RedemptionLogResponse[]> {
  await wait(300);
  return clone(
    logs.filter(
      (l) =>
        (filter.customerId === undefined ||
          l.customerId === String(filter.customerId)) &&
        (filter.voucherId === undefined || l.voucherId === filter.voucherId),
    ),
  );
}

export async function getRedemptionLog(
  id: number,
): Promise<RedemptionLogResponse> {
  await wait(200);
  const found = logs.find((l) => l.id === id);
  if (!found) throw new ApiError("Không tìm thấy bản ghi giao dịch", 404);
  return clone(found);
}

// Đọc đồng bộ, dùng nội bộ cho thống kê
export function getRedemptionsSnapshot(): RedemptionLogResponse[] {
  return logs;
}

// Spec: POST /redemptions. Mọi lần từ chối đều được ghi nhận FAILED kèm lý do.
export async function redeemVoucher(
  req: VoucherRedeemRequest,
  deviceFingerprint: string,
): Promise<VoucherRedeemResponse> {
  await wait(500);

  // Spec: customerId là string ở request, integer ở response. Mock chuyển đổi tại đây.
  const customerId = Number(req.customerId);
  if (!Number.isInteger(customerId) || customerId <= 0)
    badRequest("customerId không hợp lệ");
  if (req.cartSubtotal <= 0 || req.items.length === 0)
    badRequest("Giỏ hàng trống hoặc không hợp lệ");

  const subtotal = req.cartSubtotal;

  const fail = (message: string, voucherId: number): never => {
    buildLog(
      voucherId,
      customerId,
      subtotal,
      0,
      "FAILED",
      message,
      deviceFingerprint,
    );
    throw new ApiError(message, 400);
  };

  const voucher = findVoucherByCode(req.voucherCode);
  if (!voucher) return fail("Mã không hợp lệ", 0);

  if (isBlocked({ customerId, deviceFingerprint, ipAddress: MOCK_IP })) {
    addFraudLog({
      voucherId: voucher.id,
      customerId: String(customerId),
      ipAddress: MOCK_IP,
      deviceFingerprint,
      violationRule: "BLACKLIST_HIT",
    });
    return fail("Tài khoản hoặc thiết bị đang bị chặn", voucher.id);
  }

  const wallet = getWalletEntry(customerId, voucher.id);
  if (!wallet || wallet.status !== "AVAILABLE") {
    return fail("Mã không khả dụng trong ví khách hàng", voucher.id);
  }

  const batch = findVoucherBatch(voucher.batchId);
  const rule = batch ? findBatchRule(batch.ruleId) : undefined;
  const reward = rule ? findReward(rule.rewardId) : undefined;
  const condition = rule ? findCondition(rule.conditionId) : undefined;
  if (!reward) return fail("Quy tắc áp dụng không tồn tại", voucher.id);

  if (condition?.conditionType === "MIN_CART_AMOUNT") {
    const minAmount = Number(parseConfig(condition.config).minAmount ?? 0);
    if (subtotal < minAmount) {
      return fail(
        `Chưa đạt giá trị đơn tối thiểu ${minAmount.toLocaleString("vi-VN")} ₫`,
        voucher.id,
      );
    }
  }

  const discount = computeDiscount(reward.rewardType, reward.config, subtotal);
  if (discount === null) {
    return fail("Loại phần thưởng chưa được hỗ trợ trong bản mock", voucher.id);
  }

  setWalletStatus(wallet.id, "USED");
  const log = buildLog(
    voucher.id,
    customerId,
    subtotal,
    discount,
    "SUCCESS",
    null,
    deviceFingerprint,
  );

  const itemsTotal = req.items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );
  const lineDiscounts: LineDiscount[] = req.items.map((it) => {
    const share =
      itemsTotal === 0 ? 0 : (it.unitPrice * it.quantity) / itemsTotal;
    return {
      productId: it.productId,
      quantity: it.quantity,
      discountAmount: Math.round(discount * share),
    };
  });

  return {
    redemptionLogId: log.id,
    voucherId: voucher.id,
    code: voucher.code,
    originalAmount: subtotal,
    discountAmount: discount,
    finalAmount: subtotal - discount,
    lineDiscounts,
  };
}

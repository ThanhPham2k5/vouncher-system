// Tính thử giảm giá ở client (chỉ để hiển thị). Số tiền chính thức do BE trả về khi xác nhận.
import type { CartItem } from "./store-cart";
import type { StoreVoucher } from "./store-vouchers";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

export interface DiscountPreview {
  applicable: boolean;
  reason?: string;
  discount: number;
  final: number;
  giftNote?: string;
}

export function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

export function previewDiscount(
  voucher: StoreVoucher,
  subtotal: number,
): DiscountPreview {
  const rule = voucher.rule;
  if (subtotal < rule.minBasket) {
    return {
      applicable: false,
      reason: `Chưa đạt đơn tối thiểu ${formatVnd(rule.minBasket)}`,
      discount: 0,
      final: subtotal,
    };
  }
  let discount = 0;
  if (rule.type === "PERCENT") {
    discount = Math.min(Math.floor((subtotal * rule.percent) / 100), rule.cap);
  } else if (rule.type === "FIXED") {
    discount = Math.min(rule.amount, subtotal);
  }
  return {
    applicable: true,
    discount,
    final: subtotal - discount,
    giftNote: rule.type === "GIFT" ? voucher.detail : undefined,
  };
}

export interface RedeemResult {
  redemptionLogId: number;
  voucherId: number;
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

// Gọi BFF /api/store/redeem, BFF chuyển tiếp sang BE POST /redemptions
// Gọi BFF /api/store/redeem, BFF chuyển tiếp sang BE POST /redemptions
export async function submitRedemption(
  voucherCode: string,
  items: CartItem[],
  subtotal: number,
): Promise<RedeemResult> {
  const deviceFingerprint = await getDeviceFingerprint();
  const res = await fetch("/api/store/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voucherCode,
      cartSubtotal: subtotal,
      deviceFingerprint,
      items: items.map((item) => ({
        productId: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    }),
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => null)) as {
    message?: string;
    data?: RedeemResult;
  } | null;
  if (!res.ok || !payload?.data) {
    throw new Error(payload?.message ?? "Không áp được mã giảm giá");
  }
  return payload.data;
}

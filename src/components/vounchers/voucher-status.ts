// Nhãn và kiểu badge cho trạng thái voucher trong ví khách (BE/spec: AVAILABLE, UNAVAILABLE, USED, EXPIRED)
import type { CustomerVoucherStatus } from "@/lib/campaigns/be-types";

export const WALLET_STATUS_META: Record<
  CustomerVoucherStatus,
  { label: string; variant: "success" | "warning" | "default" | "muted" }
> = {
  AVAILABLE: { label: "Khả dụng", variant: "success" },
  UNAVAILABLE: { label: "Tạm khóa", variant: "warning" },
  USED: { label: "Đã dùng", variant: "default" },
  EXPIRED: { label: "Hết hạn", variant: "muted" },
};

export const WALLET_STATUS_ORDER: CustomerVoucherStatus[] = [
  "AVAILABLE",
  "UNAVAILABLE",
  "USED",
  "EXPIRED",
];

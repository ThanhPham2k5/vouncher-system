import type {
  ActionOnExceed,
  BlackListResponse,
  BlacklistType,
  CustomerVoucherResponse,
  FraudLogResponse,
  LimitScope,
  RateLimitConfigResponse,
  RedemptionLogResponse,
  VoucherResponse,
} from "@/lib/campaigns/be-types";

// Dữ liệu dùng chung cho các tab của trang Khách hàng & Gian lận
export interface SecurityData {
  fraudLogs: FraudLogResponse[];
  blacklist: BlackListResponse[];
  rateLimits: RateLimitConfigResponse[];
  redemptions: RedemptionLogResponse[];
  vouchers: VoucherResponse[];
  wallet: CustomerVoucherResponse[];
}

export const BLACKLIST_TYPE_LABEL: Record<BlacklistType, string> = {
  CUSTOMER: "Khách hàng",
  DEVICE_FINGERPRINT: "Thiết bị",
  IP: "Địa chỉ IP",
};

export const LIMIT_SCOPE_LABEL: Record<LimitScope, string> = {
  CUSTOMER_ID: "Theo khách hàng",
  DEVICE_FINGERPRINT: "Theo thiết bị",
  IP: "Theo địa chỉ IP",
};

export const ACTION_LABEL: Record<ActionOnExceed, string> = {
  REJECT_429: "Từ chối (429)",
  BLACKLIST: "Đưa vào danh sách đen",
};

// Bản ghi đang có hiệu lực: chưa bị vô hiệu hóa và chưa hết hạn
export function isBlacklistActive(b: BlackListResponse): boolean {
  return b.isActive && (!b.expiredAt || Date.parse(b.expiredAt) > Date.now());
}

export function findActiveBlock(
  blacklist: BlackListResponse[],
  type: BlacklistType,
  value: string | null | undefined,
): BlackListResponse | undefined {
  if (!value) return undefined;
  return blacklist.find(
    (b) => b.type === type && b.value === value && isBlacklistActive(b),
  );
}

export function voucherCodeMap(vouchers: VoucherResponse[]) {
  const map = new Map<number, string>();
  vouchers.forEach((v) => map.set(v.id, v.code));
  return (id: number) => map.get(id) ?? `#${id}`;
}

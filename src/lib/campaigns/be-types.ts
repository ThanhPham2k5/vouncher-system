// Kiểu dữ liệu khớp với enum và entity phía BE (com.dacn.VoucherSystem).
// Enum đã đối chiếu với enums/*.java.
// Lưu ý: BE chưa có DTO/Swagger cho chiến dịch và lô mã. Các shape trong phần "Chưa có API" là đề xuất,
// cần đối chiếu lại khi BE công bố DTO.

// ---- Enum (khớp với BE) ----
export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ENDED",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const BATCH_TYPES = ["GENERIC", "BULK"] as const;
export type BatchType = (typeof BATCH_TYPES)[number];

export const BATCH_STATUSES = ["DRAFT", "GENERATED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const DURATION_UNITS = ["SECONDS", "MINUTES", "HOURS", "DAYS"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const REWARD_TYPES = [
  "PERCENTAGE",
  "FIXED",
  "BUY_X_GET_Y",
  "TIERED_PERCENTAGE",
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const CONDITION_TYPES = [
  "MIN_CART_AMOUNT",
  "TIME_WINDOW",
  "CUSTOMER_SEGMENT",
  "COMPOSITE",
] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

export const RULE_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

export const LIMIT_SCOPES = [
  "IP",
  "DEVICE_FINGERPRINT",
  "CUSTOMER_ID",
] as const;
export type LimitScope = (typeof LIMIT_SCOPES)[number];

export const ACTION_ON_EXCEED = ["REJECT_429", "BLACKLIST"] as const;
export type ActionOnExceed = (typeof ACTION_ON_EXCEED)[number];

export const DISTRIBUTION_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export type DistributionStatus = (typeof DISTRIBUTION_STATUSES)[number];

export const CUSTOMER_VOUCHER_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "USED",
  "EXPIRED",
] as const;
export type CustomerVoucherStatus = (typeof CUSTOMER_VOUCHER_STATUSES)[number];

export const REDEMPTION_STATUSES = ["SUCCESS", "FAILED"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const BLACKLIST_TYPES = [
  "IP",
  "DEVICE_FINGERPRINT",
  "CUSTOMER",
] as const;
export type BlacklistType = (typeof BLACKLIST_TYPES)[number];

export const ADMIN_ROLES = [
  "SYSTEM",
  "CAMPAIGN_MANAGER",
  "SECURITY_MANAGER",
  "FINANCE_MANAGER",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// ---- Envelope chung (khớp dto/response/ApiResponse.java) ----
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

// ---- Đã có API phía BE: /auth/* ----
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  tokenType: string;
}

// ---- Đã có API phía BE: /rule/rewards, /rule/conditions ----
// Cần đối chiếu lại với controller/DTO trước khi dùng thật.
export interface RewardResponse {
  id: number;
  name: string;
  rewardType: RewardType;
  config: unknown; // JsonNode, cấu trúc theo rewardType (xem /rule/metadata)
  status: RuleStatus;
}

export interface ConditionResponse {
  id: number;
  name: string;
  conditionType: ConditionType;
  config: unknown; // JsonNode, cấu trúc theo conditionType (xem /rule/metadata)
  status: RuleStatus;
}

// ---- Đã có API phía BE: /rate-limit-configs ----
// Cần đối chiếu lại với controller/DTO trước khi dùng thật.
export interface RateLimitConfigResponse {
  id: number;
  name: string;
  endpointPattern: string;
  scope: LimitScope;
  maxRequest: number;
  timeWindowSeconds: number;
  actionOnExceed: ActionOnExceed;
  priority: number;
  isActive: boolean;
  createAt: string;
}

// ---- Chưa có API phía BE: chiến dịch & lô mã (đề xuất theo entity) ----

// Entity lưu cấu hình mã & kênh dạng JSON. Key bên trong do FE đề xuất, BE chưa định nghĩa.
export interface CodeConfig {
  prefix: string;
  length: number;
  charset: "ALPHANUMERIC" | "UPPERCASE" | "NUMERIC";
}

export interface DistributionChannels {
  email: number; // quota
  webhook: number; // quota
}

export interface VoucherBatchResponse {
  id: number;
  batchType: BatchType;
  durationValue: number;
  durationUnit: DurationUnit;
  generatedCount: number;
  redeemedCount: number;
  status: BatchStatus;
  rule: { id: number };
  codeConfigJson: CodeConfig;
  distributionChannelsJson: DistributionChannels;
  createdAt: string;
}

export interface CampaignResponse {
  id: number;
  campaignName: string;
  startTime: string; // "YYYY-MM-DDTHH:mm:ss"
  endTime: string;
  status: CampaignStatus;
  admin: { id: number }; // AdminAccount, rút gọn
  createdAt: string;
  voucherBatches: VoucherBatchResponse[];
}

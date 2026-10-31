// Kiểu dữ liệu khớp với API spec "Promotion Management & Fraud Control System API" v1.0.
// Đây là nguồn duy nhất cho enum và response shape của FE.
// Các chỗ spec có lỗi đánh máy được giữ nguyên tên như spec và ghi chú "SPEC TYPO" để chờ BE xác nhận.

// ---- Enum ----
export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "PAUSED",
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

export const DISTRIBUTION_CHANNELS = ["EMAIL", "WEBHOOK"] as const;
export type DistributionChannel = (typeof DISTRIBUTION_CHANNELS)[number];

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

// SPEC: rate-limit dùng limitScope = CUSTOMER_ID | DEVICE_FINGERPRINT | IP
export const LIMIT_SCOPES = [
  "CUSTOMER_ID",
  "DEVICE_FINGERPRINT",
  "IP",
] as const;
export type LimitScope = (typeof LIMIT_SCOPES)[number];

export const ACTION_ON_EXCEED = ["REJECT_429", "BLACKLIST"] as const;
export type ActionOnExceed = (typeof ACTION_ON_EXCEED)[number];

// SPEC: blacklist type = CUSTOMER | DEVICE_FINGERPRINT | IP
export const BLACKLIST_TYPES = [
  "CUSTOMER",
  "DEVICE_FINGERPRINT",
  "IP",
] as const;
export type BlacklistType = (typeof BLACKLIST_TYPES)[number];

// ---- Envelope chung ----
export interface ApiResponse<T> {
  status: number;
  message?: string;
  data: T;
  timestamp: string;
}

// ---- Authentication ----
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "bearer"
  accessExpiresIn: string; // SPEC: date-time, thời điểm hết hạn access token
  refreshExpiresIn: string; // SPEC: date-time, thời điểm hết hạn refresh token
}

// ---- Campaigns ----
export interface CampaignResponse {
  id: number;
  name: string;
  startTime: string; // ISO date-time
  endTime: string;
  status: CampaignStatus;
  batchIds: number[];
  adminId: number;
}

export interface CampaignCreateRequest {
  name: string;
  startTime: string;
  endTime: string;
}

export interface CampaignUpdateRequest {
  name?: string;
  startTime?: string;
  endTime?: string;
  status?: CampaignStatus;
}

// ---- Voucher batches ----
export interface CodeConfig {
  prefix: string;
  length: number;
  charset: string; // SPEC: string tự do, FE đề xuất ALPHANUMERIC | UPPERCASE | NUMERIC
}

export interface DistributionAllocation {
  channel: DistributionChannel;
  quota: number;
}

export interface DistributionChannels {
  allocations: DistributionAllocation[];
}

export interface VoucherBatchResponse {
  id: number;
  campaignId: number;
  ruleId: number;
  batchType: BatchType;
  codeConfig: CodeConfig;
  durationUnit: DurationUnit;
  durationValue: number;
  generatedCount: number; // do server tính
  redeemedCount: number; // do server tính
  distributionChannels: DistributionChannels;
  status: BatchStatus;
}

export interface VoucherBatchCreateRequest {
  campaignId: number;
  ruleId: number;
  batchType: BatchType;
  codeConfig: CodeConfig;
  durationUnit: DurationUnit;
  durationValue: number;
  // SPEC TYPO: spec ghi snake_case "distribution_channels", các trường khác là camelCase. Giữ theo spec.
  distribution_channels: DistributionChannels;
}

export interface VoucherBatchUpdateRequest {
  ruleId?: number;
  codeConfig?: CodeConfig;
  durationUnit?: DurationUnit;
  durationValue?: number;
  distributionChannels?: DistributionChannels;
  status?: BatchStatus;
}

// ---- Rule engine: rewards, conditions, metadata ----
export interface RewardResponse {
  id: number;
  name: string;
  rewardType: RewardType;
  status: RuleStatus;
  config: string; // SPEC: string, nội dung là JSON
}

export interface RewardCreateRequest {
  name: string;
  rewardType: RewardType;
  config: string;
}

export interface RewardUpdateRequest {
  name?: string;
  rewardType?: RewardType;
  config?: string;
}

export interface ConditionResponse {
  id: number;
  name: string;
  conditionType: ConditionType;
  status: RuleStatus;
  config: string;
}

export interface ConditionCreateRequest {
  name: string;
  conditionType: ConditionType;
  config: string;
}

export interface ConditionUpdateRequest {
  name?: string;
  conditionType?: ConditionType;
  config?: string;
}

export interface RuleTypeMetadata {
  type: string;
  label: string;
  description: string;
  configSchema: string; // JSON schema dạng string
}

export interface RuleMetadataResponse {
  schemaVersion: number;
  conditionTypes: RuleTypeMetadata[];
  rewardTypes: RuleTypeMetadata[];
}

// Batch rule = liên kết một reward với một condition (lô mã tham chiếu qua ruleId)
export interface BatchRuleResponse {
  id: number;
  rewardId: number;
  conditionId: number;
}

export interface BatchRuleUpdateRequest {
  rewardId?: number;
  conditionId?: number;
}

// ---- Vouchers ----
export interface VoucherResponse {
  id: number;
  batchId: number;
  campaignId: number;
  code: string;
}

export interface CustomerVoucherResponse {
  id: number;
  customerId: number;
  voucherId: number;
  status: CustomerVoucherStatus;
  claimedAt: string;
  expiredAt: string | null;
}

export interface CustomerVoucherCreateRequest {
  customerId: number;
  voucherId: number;
  expiredAt: string | null;
}

export interface CustomerVoucherUpdateRequest {
  status: CustomerVoucherStatus;
}

// ---- Distribution logs ----
export interface DistributionLogCreateRequest {
  batchId: number;
  campaignId: number;
  channel: DistributionChannel;
  targetAddress: string;
}

export interface DistributionLogResponse {
  id: number;
  voucherId: number;
  campaignId: number;
  channel: DistributionChannel;
  targetAddress: string;
  status: DistributionStatus;
  sentAt: string | null;
}

// ---- Redemptions ----
export interface CartItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface VoucherRedeemRequest {
  voucherCode: string;
  customerId: string;
  cartSubtotal: number;
  customerSegment?: string[];
  items: CartItemRequest[];
}

export interface LineDiscount {
  productId: string;
  quantity: number;
  discountAmount: number;
}

export interface VoucherRedeemResponse {
  redemptionLogId: number;
  voucherId: number;
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  lineDiscounts: LineDiscount[];
}

export interface RedemptionLogResponse {
  id: number;
  voucherId: number;
  customerId: number;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: RedemptionStatus;
  failureReason: string | null;
  createdAt: string;
}

// ---- Fraud & security ----
export interface FraudLogCreateRequest {
  voucherId: number;
  customerId: number;
  ipAddress: string;
  deviceFingerprint: string;
  violationRule: string;
}

export interface FraudLogResponse {
  id: number;
  voucherId: number;
  customerId: number;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  violationRule: string;
  createdAt: string;
}

export interface BlackListCreateRequest {
  type: BlacklistType;
  value: string;
  reason: string;
  expiredAt?: string | null;
}

export interface BlackListUpdateRequest {
  value?: string;
  reason?: string;
  isActive?: boolean;
  expiredAt?: string | null;
}

export interface BlackListResponse {
  id: number;
  type: BlacklistType;
  value: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
  expiredAt: string | null;
}

// ---- Rate limit ----
export interface RateLimitConfigCreateRequest {
  name: string;
  endpointPattern: string;
  limitScope: LimitScope;
  maxRequest: number;
  // SPEC TYPO: request ghi "timeWindowWeconds", response ghi "timeWindowSeconds". FE dùng tên của response.
  timeWindowSeconds: number;
  actionOnExceed: ActionOnExceed;
  priority: number;
}

export interface RateLimitConfigUpdateRequest {
  name?: string;
  endpointPattern?: string;
  limitScope?: LimitScope;
  maxRequest?: number;
  timeWindowSeconds?: number;
  // SPEC TYPO: spec ghi "actionnOExceed", giữ theo tên đúng như response
  actionOnExceed?: ActionOnExceed;
  priority?: number;
  isActive?: boolean;
}

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
  createdAt: string;
}

// ---- Statistics ----
// SPEC: RoiResponse chỉ khai báo "gross" (integer), các trường ROI khác chưa có trong spec.
export interface RoiResponse {
  gross: number;
}

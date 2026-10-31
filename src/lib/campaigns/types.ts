export type CampaignStatus = "ACTIVE" | "PAUSED" | "DRAFT" | "ENDED";
export type BatchType = "GENERIC" | "BULK";
export type RewardType = "PERCENT" | "FIXED" | "GIFT";
export type DurationUnit = "HOURS" | "DAYS";
export type CharsetType = "ALPHANUMERIC" | "UPPERCASE" | "NUMERIC";

export interface BatchRuleOption {
  id: string;
  name: string;
  rewardType: RewardType;
}

export interface VoucherBatch {
  id: string;
  batchType: BatchType;
  ruleId: string;
  prefix: string;
  length: number;
  charset: CharsetType;
  durationValue: number;
  durationUnit: DurationUnit;
  quotaEmail: number;
  quotaWebhook: number;
  generatedCount: number;
  redeemedCount: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  adminId: string;
  startTime: string; // "YYYY-MM-DDTHH:mm"
  endTime: string;
  budgetTotal: number;
  budgetThreshold: number;
  budgetSpent: number;
  createdAt: string;
  batches: VoucherBatch[];
}

export type VoucherBatchInput = Omit<
  VoucherBatch,
  "generatedCount" | "redeemedCount" | "id"
> & { id?: string };

export interface CampaignInput {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  budgetTotal: number;
  budgetThreshold: number;
  batches: VoucherBatchInput[];
}

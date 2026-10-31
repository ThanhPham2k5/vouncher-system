// Model FE bám theo entity BE. Enum và response shape lấy từ be-types.ts.
export * from "./be-types";
export type { CampaignInput, VoucherBatchInput } from "./schemas";

export interface BatchRuleOption {
  id: number;
  name: string;
  rewardType: import("./be-types").RewardType;
}

import type {
  CampaignResponse,
  RewardType,
  VoucherBatchResponse,
} from "./be-types";

export * from "./be-types";
export type { CampaignInput, VoucherBatchInput, Charset } from "./schemas";

// Chiến dịch kèm danh sách lô mã. Spec chỉ trả batchIds, FE tải thêm lô theo campaignId khi cần hiển thị.
export interface CampaignView extends CampaignResponse {
  batches: VoucherBatchResponse[];
}

// Lựa chọn quy tắc cho form: một batch rule (reward + condition) hiển thị bằng tên ghép
export interface BatchRuleOption {
  id: number;
  name: string;
  rewardType: RewardType;
}

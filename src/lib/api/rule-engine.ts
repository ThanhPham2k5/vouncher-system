// BE: GET /rule/metadata (công khai), GET/POST /rule/rewards, GET/PATCH /rule/rewards/{id},
// GET/POST /rule/conditions, GET/PATCH /rule/conditions/{id},
// GET /batch-rules (lọc reward_id, condition_id), GET/PATCH /batch-rules/{id}.
import type {
  BatchRuleResponse,
  BatchRuleUpdateRequest,
  ConditionCreateRequest,
  ConditionResponse,
  ConditionUpdateRequest,
  RewardCreateRequest,
  RewardResponse,
  RewardUpdateRequest,
  RuleMetadataResponse,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

// ---- Metadata (công khai ở BE) ----
export function getRuleMetadata(): Promise<RuleMetadataResponse> {
  return adminRequest<RuleMetadataResponse>("rule/metadata");
}

// ---- Rewards ----
export function listRewards(): Promise<RewardResponse[]> {
  return adminRequest<RewardResponse[]>("rule/rewards");
}

export function getReward(id: number): Promise<RewardResponse> {
  return adminRequest<RewardResponse>(`rule/rewards/${id}`);
}

export function createReward(
  req: RewardCreateRequest,
): Promise<RewardResponse> {
  return adminRequest<RewardResponse>("rule/rewards", {
    method: "POST",
    body: req,
  });
}

export function updateReward(
  id: number,
  req: RewardUpdateRequest,
): Promise<RewardResponse> {
  return adminRequest<RewardResponse>(`rule/rewards/${id}`, {
    method: "PATCH",
    body: req,
  });
}

// ---- Conditions ----
export function listConditions(): Promise<ConditionResponse[]> {
  return adminRequest<ConditionResponse[]>("rule/conditions");
}

export function getCondition(id: number): Promise<ConditionResponse> {
  return adminRequest<ConditionResponse>(`rule/conditions/${id}`);
}

export function createCondition(
  req: ConditionCreateRequest,
): Promise<ConditionResponse> {
  return adminRequest<ConditionResponse>("rule/conditions", {
    method: "POST",
    body: req,
  });
}

export function updateCondition(
  id: number,
  req: ConditionUpdateRequest,
): Promise<ConditionResponse> {
  return adminRequest<ConditionResponse>(`rule/conditions/${id}`, {
    method: "PATCH",
    body: req,
  });
}

// ---- Batch rules: GET /batch-rules, GET/PATCH /batch-rules/{id} ----
export interface BatchRuleFilter {
  rewardId?: number;
  conditionId?: number;
}

export function listBatchRules(
  filter: BatchRuleFilter = {},
): Promise<BatchRuleResponse[]> {
  return adminRequest<BatchRuleResponse[]>("batch-rules", {
    query: { reward_id: filter.rewardId, condition_id: filter.conditionId },
  });
}

export function getBatchRule(id: number): Promise<BatchRuleResponse> {
  return adminRequest<BatchRuleResponse>(`batch-rules/${id}`);
}

export function updateBatchRule(
  id: number,
  req: BatchRuleUpdateRequest,
): Promise<BatchRuleResponse> {
  return adminRequest<BatchRuleResponse>(`batch-rules/${id}`, {
    method: "PATCH",
    body: req,
  });
}

export interface BatchRuleCreateRequest {
  rewardId: number;
  conditionId: number;
}

// BE: POST /batch-rules, trả bản ghi vừa tạo
export function createBatchRule(
  req: BatchRuleCreateRequest,
): Promise<BatchRuleResponse> {
  return adminRequest<BatchRuleResponse>("batch-rules", {
    method: "POST",
    body: req,
  });
}

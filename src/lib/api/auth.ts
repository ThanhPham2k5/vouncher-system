// BE: GET /rule/metadata (công khai), GET/POST /rule/rewards, GET/PATCH /rule/rewards/{id},
// GET/POST /rule/conditions, GET/PATCH /rule/conditions/{id}.
// Batch rules không có trong BE nên vẫn mock theo spec "Rule Engine": /batch-rules.
import { MOCK_BATCH_RULES } from "@/lib/campaigns/mock-data";
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
import { clone, notFound, wait } from "./common";
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

// ---- Batch rules (mock theo spec, BE chưa có) ----
// Dữ liệu seed tham chiếu ID reward/condition mock. Khi nối BE, các ID này có thể không tồn tại.
let batchRules: BatchRuleResponse[] = clone(MOCK_BATCH_RULES);

export interface BatchRuleFilter {
  rewardId?: number;
  conditionId?: number;
}

export async function listBatchRules(
  filter: BatchRuleFilter = {},
): Promise<BatchRuleResponse[]> {
  await wait(200);
  return clone(
    batchRules.filter(
      (r) =>
        (filter.rewardId === undefined || r.rewardId === filter.rewardId) &&
        (filter.conditionId === undefined ||
          r.conditionId === filter.conditionId),
    ),
  );
}

export async function getBatchRule(id: number): Promise<BatchRuleResponse> {
  await wait(200);
  const found = batchRules.find((r) => r.id === id);
  if (!found) notFound("quy tắc");
  return clone(found);
}

// Kiểm tra reward/condition tham chiếu bằng dữ liệu thật từ BE
export async function updateBatchRule(
  id: number,
  req: BatchRuleUpdateRequest,
): Promise<BatchRuleResponse> {
  await wait();
  const existing = batchRules.find((r) => r.id === id);
  if (!existing) notFound("quy tắc");
  if (req.rewardId !== undefined) {
    const rewards = await listRewards();
    if (!rewards.some((r) => r.id === req.rewardId))
      notFound("cấu hình phần thưởng");
  }
  if (req.conditionId !== undefined) {
    const conditions = await listConditions();
    if (!conditions.some((c) => c.id === req.conditionId))
      notFound("cấu hình điều kiện");
  }
  const updated: BatchRuleResponse = {
    ...existing,
    rewardId: req.rewardId ?? existing.rewardId,
    conditionId: req.conditionId ?? existing.conditionId,
  };
  batchRules = batchRules.map((r) => (r.id === id ? updated : r));
  return clone(updated);
}

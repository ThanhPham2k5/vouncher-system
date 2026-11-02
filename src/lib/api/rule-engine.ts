// Mock theo spec "Rule Engine": /rule/rewards, /rule/conditions, /rule/metadata, /batch-rules.
// Spec không có POST /batch-rules, nên liên kết reward-condition chỉ có seed và sửa, không tạo mới.
import {
  MOCK_BATCH_RULES,
  MOCK_CONDITIONS,
  MOCK_REWARDS,
} from "@/lib/campaigns/mock-data";
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
import {
  assertJsonConfig,
  badRequest,
  clone,
  nextId,
  notFound,
  wait,
} from "./common";

const METADATA: RuleMetadataResponse = {
  schemaVersion: 1,
  conditionTypes: [
    {
      type: "MIN_CART_AMOUNT",
      label: "Giá trị giỏ hàng tối thiểu",
      description: "Áp dụng khi tổng giỏ hàng đạt mức tối thiểu",
      configSchema: {
        type: "object",
        required: ["minAmount"],
        properties: { minAmount: { type: "integer", minimum: 0 } },
      },
    },
    {
      type: "TIME_WINDOW",
      label: "Khung giờ áp dụng",
      description: "Chỉ áp dụng trong khung giờ trong ngày",
      configSchema: {
        type: "object",
        required: ["from", "to"],
        properties: {
          from: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          to: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        },
      },
    },
    {
      type: "CUSTOMER_SEGMENT",
      label: "Nhóm khách hàng",
      description: "Áp dụng cho các hạng khách hàng",
      configSchema: {
        type: "object",
        required: ["segments"],
        properties: { segments: { type: "array", items: { type: "string" } } },
      },
    },
    {
      type: "COMPOSITE",
      label: "Điều kiện kết hợp",
      description: "Kết hợp nhiều điều kiện bằng AND hoặc OR",
      configSchema: {
        type: "object",
        required: ["operator", "items"],
        properties: {
          operator: { enum: ["AND", "OR"] },
          items: { type: "array" },
        },
      },
    },
  ],
  rewardTypes: [
    {
      type: "PERCENTAGE",
      label: "Giảm theo %",
      description: "Giảm theo tỷ lệ phần trăm, có thể giới hạn mức tối đa",
      configSchema: {
        type: "object",
        required: ["percent"],
        properties: {
          percent: { type: "number", minimum: 0, maximum: 100 },
          maxAmount: { type: "integer", minimum: 0 },
        },
      },
    },
    {
      type: "FIXED",
      label: "Giảm số tiền cố định",
      description: "Trừ trực tiếp một số tiền",
      configSchema: {
        type: "object",
        required: ["amount"],
        properties: { amount: { type: "integer", minimum: 0 } },
      },
    },
    {
      type: "BUY_X_GET_Y",
      label: "Mua X tặng Y",
      description: "Mua X sản phẩm được tặng Y sản phẩm",
      configSchema: {
        type: "object",
        required: ["buy", "get"],
        properties: {
          buy: { type: "integer", minimum: 1 },
          get: { type: "integer", minimum: 1 },
        },
      },
    },
    {
      type: "TIERED_PERCENTAGE",
      label: "Giảm theo bậc",
      description: "Tỷ lệ giảm tăng theo giá trị giỏ hàng",
      configSchema: {
        type: "object",
        required: ["tiers"],
        properties: {
          tiers: {
            type: "array",
            items: {
              type: "object",
              required: ["minAmount", "percent"],
              properties: {
                minAmount: { type: "integer", minimum: 0 },
                percent: { type: "number", minimum: 0, maximum: 100 },
              },
            },
          },
        },
      },
    },
  ],
};

let rewards: RewardResponse[] = clone(MOCK_REWARDS);
let conditions: ConditionResponse[] = clone(MOCK_CONDITIONS);
let batchRules: BatchRuleResponse[] = clone(MOCK_BATCH_RULES);

function assertName(name: string | undefined): void {
  if (name !== undefined && name.trim().length === 0) {
    badRequest("name không được để trống");
  }
}

// Đọc đồng bộ, dùng nội bộ ở mock (ví dụ tính giảm giá khi đổi mã)
export function findReward(id: number): RewardResponse | undefined {
  return rewards.find((r) => r.id === id);
}

export function findCondition(id: number): ConditionResponse | undefined {
  return conditions.find((c) => c.id === id);
}

export function findBatchRule(id: number): BatchRuleResponse | undefined {
  return batchRules.find((r) => r.id === id);
}

export async function getRuleMetadata(): Promise<RuleMetadataResponse> {
  await wait(200);
  return clone(METADATA);
}

// ---- Rewards: GET/POST /rule/rewards, GET/PATCH /rule/rewards/{id} ----
export async function listRewards(): Promise<RewardResponse[]> {
  await wait(200);
  return clone(rewards);
}

export async function getReward(id: number): Promise<RewardResponse> {
  await wait(200);
  const found = findReward(id);
  if (!found) notFound("cấu hình phần thưởng");
  return clone(found);
}

export async function createReward(
  req: RewardCreateRequest,
): Promise<RewardResponse> {
  await wait();
  assertName(req.name);
  assertJsonConfig(req.config);
  const created: RewardResponse = {
    id: nextId(rewards.map((r) => r.id)),
    name: req.name.trim(),
    rewardType: req.rewardType,
    status: "DRAFT",
    config: req.config,
  };
  rewards = [...rewards, created];
  return clone(created);
}

export async function updateReward(
  id: number,
  req: RewardUpdateRequest,
): Promise<RewardResponse> {
  await wait();
  const existing = findReward(id);
  if (!existing) notFound("cấu hình phần thưởng");
  assertName(req.name);
  if (req.config !== undefined) assertJsonConfig(req.config);
  const updated: RewardResponse = {
    ...existing,
    name: req.name?.trim() ?? existing.name,
    rewardType: req.rewardType ?? existing.rewardType,
    config: req.config ?? existing.config,
  };
  rewards = rewards.map((r) => (r.id === id ? updated : r));
  return clone(updated);
}

// ---- Conditions: GET/POST /rule/conditions, GET/PATCH /rule/conditions/{id} ----
export async function listConditions(): Promise<ConditionResponse[]> {
  await wait(200);
  return clone(conditions);
}

export async function getCondition(id: number): Promise<ConditionResponse> {
  await wait(200);
  const found = findCondition(id);
  if (!found) notFound("cấu hình điều kiện");
  return clone(found);
}

export async function createCondition(
  req: ConditionCreateRequest,
): Promise<ConditionResponse> {
  await wait();
  assertName(req.name);
  assertJsonConfig(req.config);
  const created: ConditionResponse = {
    id: nextId(conditions.map((c) => c.id)),
    name: req.name.trim(),
    conditionType: req.conditionType,
    status: "DRAFT",
    config: req.config,
  };
  conditions = [...conditions, created];
  return clone(created);
}

export async function updateCondition(
  id: number,
  req: ConditionUpdateRequest,
): Promise<ConditionResponse> {
  await wait();
  const existing = findCondition(id);
  if (!existing) notFound("cấu hình điều kiện");
  assertName(req.name);
  if (req.config !== undefined) assertJsonConfig(req.config);
  const updated: ConditionResponse = {
    ...existing,
    name: req.name?.trim() ?? existing.name,
    conditionType: req.conditionType ?? existing.conditionType,
    config: req.config ?? existing.config,
  };
  conditions = conditions.map((c) => (c.id === id ? updated : c));
  return clone(updated);
}

// ---- Batch rules: GET /batch-rules, GET/PATCH /batch-rules/{id} ----
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
  const found = findBatchRule(id);
  if (!found) notFound("quy tắc");
  return clone(found);
}

export async function updateBatchRule(
  id: number,
  req: BatchRuleUpdateRequest,
): Promise<BatchRuleResponse> {
  await wait();
  const existing = findBatchRule(id);
  if (!existing) notFound("quy tắc");
  if (req.rewardId !== undefined && !findReward(req.rewardId))
    notFound("cấu hình phần thưởng");
  if (req.conditionId !== undefined && !findCondition(req.conditionId))
    notFound("cấu hình điều kiện");
  const updated: BatchRuleResponse = {
    ...existing,
    rewardId: req.rewardId ?? existing.rewardId,
    conditionId: req.conditionId ?? existing.conditionId,
  };
  batchRules = batchRules.map((r) => (r.id === id ? updated : r));
  return clone(updated);
}

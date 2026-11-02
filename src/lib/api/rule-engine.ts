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

// Khớp với BE: src/main/resources/data/rule_metadata/{conditions|rewards}/*.json
const METADATA: RuleMetadataResponse = {
  schemaVersion: 1,
  conditionTypes: [
    {
      type: "MIN_CART_AMOUNT",
      label: "Giá trị giỏ hàng tối thiểu",
      description: "Kiểm tra tổng tiền hàng trước chiết khấu.",
      configSchema: {
        type: "object",
        properties: {
          minimumAmount: { type: "number", minimum: 0 },
          amountBasis: { type: "string", enum: ["CART_SUBTOTAL"] },
        },
        required: ["minimumAmount", "amountBasis"],
        additionalProperties: false,
      },
    },
    {
      type: "TIME_WINDOW",
      label: "Khung giờ vàng",
      description: "Chỉ áp dụng trong các khoảng giờ được cấu hình.",
      configSchema: {
        type: "object",
        properties: {
          timezone: { type: "string", default: "Asia/Ho_Chi_Minh" },
          windows: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                startTime: {
                  type: "string",
                  pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                },
                endTime: {
                  type: "string",
                  pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                },
              },
              required: ["startTime", "endTime"],
              additionalProperties: false,
            },
          },
        },
        required: ["timezone", "windows"],
        additionalProperties: false,
      },
    },
    {
      type: "CUSTOMER_SEGMENT",
      label: "Nhóm khách hàng",
      description: "Kiểm tra nhóm thành viên của khách hàng.",
      configSchema: {
        type: "object",
        properties: {
          operator: { type: "string", enum: ["IN", "NOT_IN"] },
          segments: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
        },
        required: ["operator", "segments"],
        additionalProperties: false,
      },
    },
    {
      type: "COMPOSITE",
      label: "Kết hợp nhiều điều kiện",
      description: "Kết hợp các điều kiện con bằng AND hoặc OR.",
      configSchema: {
        type: "object",
        properties: {
          operator: { type: "string", enum: ["AND", "OR"] },
          conditions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["MIN_CART_AMOUNT", "TIME_WINDOW", "CUSTOMER_SEGMENT"],
                },
                config: { type: "object" },
              },
              required: ["type", "config"],
              additionalProperties: false,
            },
          },
        },
        required: ["operator", "conditions"],
        additionalProperties: false,
      },
    },
  ],
  rewardTypes: [
    {
      type: "PERCENTAGE",
      label: "Giảm theo phần trăm",
      description: "Giảm theo tỷ lệ phần trăm, có giới hạn số tiền giảm.",
      configSchema: {
        type: "object",
        properties: {
          discountPercent: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: 100,
          },
          maxDiscountAmount: { type: "number", minimum: 0 },
          amountBasis: { type: "string", enum: ["CART_SUBTOTAL"] },
        },
        required: ["discountPercent", "maxDiscountAmount", "amountBasis"],
        additionalProperties: false,
      },
    },
    {
      type: "FIXED",
      label: "Giảm số tiền cố định",
      description: "Giảm một số tiền được xác định trước.",
      configSchema: {
        type: "object",
        properties: { discountValue: { type: "number", exclusiveMinimum: 0 } },
        required: ["discountValue"],
        additionalProperties: false,
      },
    },
    {
      type: "BUY_X_GET_Y",
      label: "Mua X tặng Y",
      description: "Tặng sản phẩm khi đạt số lượng mua theo quy tắc.",
      configSchema: {
        type: "object",
        properties: {
          calculationMode: { type: "string", enum: ["PER_QUALIFYING_SET"] },
          buy: {
            type: "object",
            properties: {
              productIds: {
                type: "array",
                minItems: 1,
                uniqueItems: true,
                items: { type: "string", minLength: 1 },
              },
              quantity: { type: "integer", minimum: 1 },
            },
            required: ["productIds", "quantity"],
            additionalProperties: false,
          },
          get: {
            type: "object",
            properties: {
              productIds: {
                type: "array",
                minItems: 1,
                uniqueItems: true,
                items: { type: "string", minLength: 1 },
              },
              quantity: { type: "integer", minimum: 1 },
              discountPercent: {
                type: "number",
                exclusiveMinimum: 0,
                maximum: 100,
              },
            },
            required: ["productIds", "quantity", "discountPercent"],
            additionalProperties: false,
          },
          maxApplicationsPerOrder: { type: "integer", minimum: 1 },
        },
        required: ["calculationMode", "buy", "get", "maxApplicationsPerOrder"],
        additionalProperties: false,
      },
    },
    {
      type: "TIERED_PERCENTAGE",
      label: "Chiết khấu theo bậc",
      description: "Chọn mức phần trăm theo tổng tiền hàng.",
      configSchema: {
        type: "object",
        properties: {
          calculationMode: { type: "string", enum: ["HIGHEST_MATCH"] },
          amountBasis: { type: "string", enum: ["CART_SUBTOTAL"] },
          tiers: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                minCartAmount: { type: "number", minimum: 0 },
                discountPercent: {
                  type: "number",
                  exclusiveMinimum: 0,
                  maximum: 100,
                },
                maxDiscountAmount: { type: "number", minimum: 0 },
              },
              required: [
                "minCartAmount",
                "discountPercent",
                "maxDiscountAmount",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["calculationMode", "amountBasis", "tiers"],
        additionalProperties: false,
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

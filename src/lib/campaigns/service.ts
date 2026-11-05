import {
  fetchCampaign,
  fetchCampaigns,
  patchCampaign,
  postCampaign,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/common";
import {
  listBatchRules,
  listConditions,
  listRewards,
} from "@/lib/api/rule-engine";
import {
  createVoucherBatch,
  listVoucherBatches as fetchVoucherBatches,
  updateVoucherBatch,
  type VoucherBatchPatch,
} from "@/lib/api/voucher-batches";
import { campaignInputSchema, toDistributionChannels } from "./schemas";
import type {
  BatchRuleOption,
  CampaignInput,
  CampaignResponse,
  CampaignStatus,
  CampaignView,
  VoucherBatchCreateRequest,
  VoucherBatchInput,
  VoucherBatchResponse,
} from "./types";

// Chiến dịch, lô mã và quy tắc đều lấy từ BE qua BFF.
// Tạo/sửa chiến dịch gọi nhiều endpoint liên tiếp, FE không có transaction nên có thể lưu dở nếu một bước lỗi.

export { fetchVoucherBatches as listVoucherBatches };

// Spec không cho người dùng đặt ENDED, nên FE tự hiển thị ENDED khi quá endTime
function resolveStatus(c: CampaignResponse): CampaignStatus {
  if (c.status === "DRAFT" || c.status === "ENDED") return c.status;
  const end = Date.parse(c.endTime);
  return !Number.isNaN(end) && end < Date.now() ? "ENDED" : c.status;
}

function toView(
  c: CampaignResponse,
  batches: VoucherBatchResponse[],
): CampaignView {
  const own = batches.filter((b) => b.campaignId === c.id);
  return {
    ...c,
    status: resolveStatus(c),
    batchIds: own.map((b) => b.id),
    batches: own,
  };
}

function assertValid(input: CampaignInput): void {
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }
}

function toCreateBatch(
  input: VoucherBatchInput,
  campaignId: number,
): VoucherBatchCreateRequest {
  return {
    campaignId,
    ruleId: input.ruleId,
    batchType: input.batchType,
    codeConfig: { ...input.codeConfig },
    durationUnit: input.durationUnit,
    durationValue: input.durationValue,
    distribution_channels: toDistributionChannels(input),
  };
}

function toPatchBatch(input: VoucherBatchInput): VoucherBatchPatch {
  return {
    ruleId: input.ruleId,
    batchType: input.batchType,
    codeConfig: { ...input.codeConfig },
    durationUnit: input.durationUnit,
    durationValue: input.durationValue,
    distributionChannels: toDistributionChannels(input),
  };
}

// Lô đã sinh mã không sửa được ở BE. Nếu form gửi dữ liệu khác thì báo lỗi rõ ràng.
function matchesBatch(
  current: VoucherBatchResponse,
  input: VoucherBatchInput,
): boolean {
  const quotaOf = (channel: string): number =>
    current.distributionChannels.allocations.find((a) => a.channel === channel)
      ?.quota ?? 0;
  return (
    current.ruleId === input.ruleId &&
    current.batchType === input.batchType &&
    current.codeConfig.prefix === input.codeConfig.prefix &&
    current.codeConfig.length === input.codeConfig.length &&
    current.codeConfig.charset === input.codeConfig.charset &&
    current.durationUnit === input.durationUnit &&
    current.durationValue === input.durationValue &&
    quotaOf("EMAIL") === input.quotaEmail &&
    quotaOf("WEBHOOK") === input.quotaWebhook
  );
}

export async function listCampaigns(): Promise<CampaignView[]> {
  const [campaigns, batches] = await Promise.all([
    fetchCampaigns(),
    fetchVoucherBatches(),
  ]);
  return campaigns.map((c) => toView(c, batches));
}

export async function getCampaign(id: number): Promise<CampaignView | null> {
  try {
    const campaign = await fetchCampaign(id);
    return toView(campaign, await fetchVoucherBatches(id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// BE tạo chiến dịch ở trạng thái DRAFT, sau đó tạo từng lô mã
export async function createCampaign(
  input: CampaignInput,
): Promise<CampaignView> {
  assertValid(input);
  const created = await postCampaign({
    name: input.name.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
  });
  for (const batch of input.batches) {
    await createVoucherBatch(toCreateBatch(batch, created.id));
  }
  return toView(created, await fetchVoucherBatches(created.id));
}

// PATCH chiến dịch, sau đó: lô mới (không có id) được tạo, lô DRAFT được PATCH, lô GENERATED chỉ được giữ nguyên.
// BE chưa có endpoint xóa lô, nên lô bị bỏ khỏi form vẫn còn ở BE.
export async function updateCampaign(
  id: number,
  input: CampaignInput,
): Promise<CampaignView> {
  assertValid(input);
  const updated = await patchCampaign(id, {
    name: input.name.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
  });

  const current = await fetchVoucherBatches(id);
  for (const batch of input.batches) {
    if (batch.id === undefined) {
      await createVoucherBatch(toCreateBatch(batch, id));
      continue;
    }
    const existing = current.find((b) => b.id === batch.id);
    if (!existing) {
      throw new Error(`Lô mã #${batch.id} không thuộc chiến dịch này`);
    }
    if (existing.status === "GENERATED") {
      if (!matchesBatch(existing, batch)) {
        throw new Error("Lô đã sinh mã, không thể chỉnh sửa");
      }
      continue;
    }
    await updateVoucherBatch(existing.id, toPatchBatch(batch));
  }

  return toView(updated, await fetchVoucherBatches(id));
}

// Đổi trạng thái qua PATCH /campaigns/{id}. BE hiện nhận status trong body nhưng không lưu
// (CampaignServiceImpl.updateCampaign bỏ qua status), nên nếu BE trả về trạng thái cũ thì báo lỗi rõ ràng.
export async function setCampaignStatus(
  id: number,
  status: "ACTIVE" | "PAUSED",
): Promise<CampaignView> {
  const current = await fetchCampaign(id);
  if (resolveStatus(current) === "ENDED") {
    throw new Error("Chiến dịch đã hết hạn, không thể đổi trạng thái");
  }
  const updated = await patchCampaign(id, { status });
  if (updated.status !== status) {
    throw new Error(
      "Backend chưa lưu được trạng thái chiến dịch. CampaignServiceImpl.updateCampaign cần xử lý request.status.",
    );
  }
  return toView(updated, await fetchVoucherBatches(id));
}

// Danh sách batch rule cho form: tên ghép từ reward và condition
export async function listRules(): Promise<BatchRuleOption[]> {
  const [rules, rewards, conditions] = await Promise.all([
    listBatchRules(),
    listRewards(),
    listConditions(),
  ]);
  return rules.map((r) => {
    const reward = rewards.find((x) => x.id === r.rewardId);
    const condition = conditions.find((x) => x.id === r.conditionId);
    return {
      id: r.id,
      name: `${reward?.name ?? "Chưa rõ phần thưởng"} · ${condition?.name ?? "Chưa rõ điều kiện"}`,
      rewardType: reward?.rewardType ?? "PERCENTAGE",
    };
  });
}

// Sửa một lô ở trạng thái DRAFT. BE trả lỗi nếu lô đã GENERATED.
export function updateCampaignBatch(
  batchId: number,
  input: VoucherBatchInput,
): Promise<VoucherBatchResponse> {
  return updateVoucherBatch(batchId, toPatchBatch(input));
}

// Kích hoạt tạo mã: BE sinh voucher, chuyển lô sang GENERATED và công bố quy tắc liên quan.
export function activateCampaignBatch(
  batchId: number,
): Promise<VoucherBatchResponse> {
  return updateVoucherBatch(batchId, { status: "GENERATED" });
}

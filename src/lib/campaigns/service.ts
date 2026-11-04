import { campaignInputSchema, toDistributionChannels } from "./schemas";
import { ApiError } from "@/lib/api/common";
import {
  fetchCampaign,
  fetchCampaigns,
  patchCampaign,
  postCampaign,
} from "@/lib/api/campaigns";
import {
  MOCK_BATCHES,
  MOCK_BATCH_RULES,
  MOCK_CONDITIONS,
  MOCK_REWARDS,
} from "./mock-data";
import type {
  BatchRuleOption,
  CampaignInput,
  CampaignResponse,
  CampaignStatus,
  CampaignView,
  VoucherBatchInput,
  VoucherBatchResponse,
  VoucherBatchUpdateRequest,
} from "./types";

// Chiến dịch lấy từ BE qua BFF. Lô mã vẫn là dữ liệu mẫu trong bộ nhớ vì BE chưa có endpoint voucher-batches.
// Lô mẫu gắn theo campaignId nên có thể trùng id với chiến dịch thật. Đây là phần cần nối BE tiếp.
let batches: VoucherBatchResponse[] = structuredClone(MOCK_BATCHES);
let nextBatchId = 2000;

function wait(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Spec không cho người dùng đặt ENDED, nên FE tự hiển thị ENDED khi quá endTime
function resolveStatus(c: CampaignResponse): CampaignStatus {
  if (c.status === "DRAFT" || c.status === "ENDED") return c.status;
  const end = Date.parse(c.endTime);
  return !Number.isNaN(end) && end < Date.now() ? "ENDED" : c.status;
}

function toView(c: CampaignResponse): CampaignView {
  const own = batches.filter((b) => b.campaignId === c.id);
  return structuredClone({
    ...c,
    status: resolveStatus(c),
    batchIds: own.map((b) => b.id),
    batches: own,
  });
}

function assertValid(input: CampaignInput): void {
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }
}

function toBatch(
  input: VoucherBatchInput,
  campaignId: number,
  existing?: VoucherBatchResponse,
): VoucherBatchResponse {
  return {
    id: existing?.id ?? nextBatchId++,
    campaignId,
    ruleId: input.ruleId,
    batchType: input.batchType,
    codeConfig: { ...input.codeConfig },
    durationUnit: input.durationUnit,
    durationValue: input.durationValue,
    generatedCount: existing?.generatedCount ?? 0,
    redeemedCount: existing?.redeemedCount ?? 0,
    distributionChannels: toDistributionChannels(input),
    status: existing?.status ?? "DRAFT",
  };
}

export async function listCampaigns(): Promise<CampaignView[]> {
  const list = await fetchCampaigns();
  return list.map(toView);
}

export async function getCampaign(id: number): Promise<CampaignView | null> {
  try {
    return toView(await fetchCampaign(id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// BE tạo chiến dịch ở trạng thái DRAFT. Lô mã đi kèm hiện chỉ lưu trong bộ nhớ.
export async function createCampaign(
  input: CampaignInput,
): Promise<CampaignView> {
  assertValid(input);
  const created = await postCampaign({
    name: input.name.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
  });
  batches = [...batches, ...input.batches.map((b) => toBatch(b, created.id))];
  return toView(created);
}

// PATCH chiến dịch qua BE. Lô đã có (có id) được cập nhật, lô mới (không có id) được thêm, trong bộ nhớ.
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

  batches = [
    ...batches.map((b) => {
      if (b.campaignId !== id) return b;
      const incoming = input.batches.find((x) => x.id === b.id);
      return incoming ? toBatch(incoming, id, b) : b;
    }),
    ...input.batches
      .filter((x) => x.id === undefined)
      .map((x) => toBatch(x, id)),
  ];

  return toView(updated);
}

// Đổi trạng thái qua PATCH /campaigns/{id}. BE hiện chỉ nhận status trong body nhưng không lưu,
// nên nếu BE trả về trạng thái cũ thì báo lỗi rõ ràng thay vì báo thành công giả.
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
      "Backend chưa lưu được trạng thái chiến dịch. CampaignController.updateConfig cần truyền request.status vào service.",
    );
  }
  return toView(updated);
}

// Danh sách batch rule cho form: tên ghép từ reward và condition
export async function listRules(): Promise<BatchRuleOption[]> {
  await wait(200);
  return MOCK_BATCH_RULES.map((r) => {
    const reward = MOCK_REWARDS.find((x) => x.id === r.rewardId);
    const condition = MOCK_CONDITIONS.find((x) => x.id === r.conditionId);
    return {
      id: r.id,
      name: `${reward?.name ?? "Chưa rõ phần thưởng"} · ${condition?.name ?? "Chưa rõ điều kiện"}`,
      rewardType: reward?.rewardType ?? "PERCENTAGE",
    };
  });
}

// ---- Voucher batches: GET /voucher-batches, GET/PATCH /voucher-batches/{id} ----
export function findVoucherBatch(id: number): VoucherBatchResponse | undefined {
  const found = batches.find((b) => b.id === id);
  return found ? structuredClone(found) : undefined;
}

export async function listVoucherBatches(
  campaignId?: number,
): Promise<VoucherBatchResponse[]> {
  await wait(300);
  return batches
    .filter((b) => campaignId === undefined || b.campaignId === campaignId)
    .map((b) => structuredClone(b));
}

export async function getVoucherBatch(
  id: number,
): Promise<VoucherBatchResponse> {
  await wait(200);
  const found = batches.find((b) => b.id === id);
  if (!found) throw new Error("Không tìm thấy lô mã");
  return structuredClone(found);
}

export async function updateVoucherBatch(
  id: number,
  req: VoucherBatchUpdateRequest,
): Promise<VoucherBatchResponse> {
  await wait();
  const existing = batches.find((b) => b.id === id);
  if (!existing) throw new Error("Không tìm thấy lô mã");
  if (req.codeConfig && existing.status === "GENERATED") {
    throw new Error("Lô đã sinh mã, không thể đổi codeConfig");
  }
  if (req.codeConfig && !/^[A-Z0-9_]{2,10}$/.test(req.codeConfig.prefix)) {
    throw new Error("Tiền tố 2–10 ký tự: A–Z, 0–9, _");
  }
  const updated: VoucherBatchResponse = {
    ...existing,
    ruleId: req.ruleId ?? existing.ruleId,
    codeConfig: req.codeConfig ? { ...req.codeConfig } : existing.codeConfig,
    durationUnit: req.durationUnit ?? existing.durationUnit,
    durationValue: req.durationValue ?? existing.durationValue,
    distributionChannels:
      req.distributionChannels ?? existing.distributionChannels,
    status: req.status ?? existing.status,
  };
  batches = batches.map((b) => (b.id === id ? updated : b));
  return structuredClone(updated);
}

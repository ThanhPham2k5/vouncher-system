import { campaignInputSchema, toDistributionChannels } from "./schemas";
import {
  MOCK_BATCHES,
  MOCK_BATCH_RULES,
  MOCK_CAMPAIGNS,
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
} from "./types";

// Dữ liệu nằm trong bộ nhớ trình duyệt, tải lại trang sẽ về dữ liệu mẫu.
// Khi BE có API thật, thay từng hàm bằng fetch tới BACKEND_URL qua route handler.
// Theo spec: tạo chiến dịch = POST /campaigns, mỗi lô = POST /voucher-batches.
// Spec không có DELETE lô mã, nên lô bị bỏ khỏi form vẫn được giữ lại.
let campaigns: CampaignResponse[] = structuredClone(MOCK_CAMPAIGNS);
let batches: VoucherBatchResponse[] = structuredClone(MOCK_BATCHES);
let nextCampaignId = 1000;
let nextBatchId = 2000;
const ADMIN_ID = 1;

function wait(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Spec không cho người dùng đặt EXPIRED, nên FE tự chuyển khi quá endTime
function resolveStatus(c: CampaignResponse): CampaignStatus {
  if (c.status === "DRAFT" || c.status === "EXPIRED") return c.status;
  const end = Date.parse(c.endTime);
  return !Number.isNaN(end) && end < Date.now() ? "EXPIRED" : c.status;
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
  await wait();
  return campaigns.map(toView);
}

export async function getCampaign(id: number): Promise<CampaignView | null> {
  await wait(300);
  const found = campaigns.find((c) => c.id === id);
  return found ? toView(found) : null;
}

// Tạo chiến dịch ở trạng thái DRAFT rồi tạo từng lô. Kích hoạt ở trang chi tiết.
export async function createCampaign(
  input: CampaignInput,
): Promise<CampaignView> {
  await wait();
  assertValid(input);
  const id = nextCampaignId++;
  const created: CampaignResponse = {
    id,
    name: input.name.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    status: "DRAFT",
    batchIds: [],
    adminId: ADMIN_ID,
  };
  campaigns = [created, ...campaigns];
  batches = [...batches, ...input.batches.map((b) => toBatch(b, id))];
  return toView(created);
}

// PATCH chiến dịch, PATCH các lô đã có (có id), POST các lô mới (không có id)
export async function updateCampaign(
  id: number,
  input: CampaignInput,
): Promise<CampaignView> {
  await wait();
  assertValid(input);
  const existing = campaigns.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");

  const updated: CampaignResponse = {
    ...existing,
    name: input.name.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
  };
  campaigns = campaigns.map((c) => (c.id === id ? updated : c));

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

// Spec đổi trạng thái qua PATCH /campaigns/{id} với trường status
export async function setCampaignStatus(
  id: number,
  status: "ACTIVE" | "PAUSED",
): Promise<CampaignView> {
  await wait(300);
  const existing = campaigns.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");
  if (resolveStatus(existing) === "EXPIRED") {
    throw new Error("Chiến dịch đã hết hạn, không thể đổi trạng thái");
  }
  const updated: CampaignResponse = { ...existing, status };
  campaigns = campaigns.map((c) => (c.id === id ? updated : c));
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

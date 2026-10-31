import { campaignInputSchema } from "./schemas";
import { MOCK_CAMPAIGNS, MOCK_RULES } from "./mock-data";
import type {
  BatchRuleOption,
  CampaignInput,
  CampaignResponse,
  CampaignStatus,
  VoucherBatchResponse,
} from "./types";

// Dữ liệu nằm trong bộ nhớ trình duyệt, tải lại trang sẽ về dữ liệu mẫu.
// Khi BE có API chiến dịch, thay từng hàm bằng fetch tới BACKEND_URL qua route handler.
let store: CampaignResponse[] = structuredClone(MOCK_CAMPAIGNS);
let nextId = 1000;

function wait(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Chiến dịch đang ACTIVE/PAUSED mà quá endTime thì hiển thị ENDED (không ghi đè dữ liệu gốc).
function resolveStatus(c: CampaignResponse): CampaignStatus {
  if (c.status === "DRAFT") return "DRAFT";
  const end = new Date(c.endTime).getTime();
  if (!Number.isNaN(end) && end < Date.now()) return "ENDED";
  return c.status;
}

function view(c: CampaignResponse): CampaignResponse {
  return structuredClone({ ...c, status: resolveStatus(c) });
}

function toBatches(
  input: CampaignInput,
  previous?: CampaignResponse,
): VoucherBatchResponse[] {
  return input.voucherBatches.map((b) => {
    const old = previous?.voucherBatches.find((x) => x.id === b.id);
    return {
      id: old?.id ?? nextId++,
      status: old?.status ?? "DRAFT",
      batchType: b.batchType,
      durationValue: b.durationValue,
      durationUnit: b.durationUnit,
      generatedCount: old?.generatedCount ?? 0,
      redeemedCount: old?.redeemedCount ?? 0,
      rule: { id: b.ruleId },
      codeConfigJson: { ...b.codeConfig },
      distributionChannelsJson: {
        email: b.distributionChannels.email,
        webhook: b.distributionChannels.webhook,
      },
      createdAt: old?.createdAt ?? new Date().toISOString(),
    };
  });
}

function assertValid(input: CampaignInput): void {
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }
}

export async function listCampaigns(): Promise<CampaignResponse[]> {
  await wait();
  return store.map(view);
}

export async function getCampaign(
  id: number,
): Promise<CampaignResponse | null> {
  await wait(300);
  const found = store.find((c) => c.id === id);
  return found ? view(found) : null;
}

export async function createCampaign(
  input: CampaignInput,
): Promise<CampaignResponse> {
  await wait();
  assertValid(input);
  const now = new Date().toISOString();
  const campaign: CampaignResponse = {
    id: nextId++,
    campaignName: input.campaignName.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status ?? "ACTIVE",
    admin: { id: 1 },
    createdAt: now,
    voucherBatches: toBatches(input),
  };
  store = [campaign, ...store];
  return view(campaign);
}

export async function updateCampaign(
  id: number,
  input: CampaignInput,
): Promise<CampaignResponse> {
  await wait();
  assertValid(input);
  const existing = store.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");
  const updated: CampaignResponse = {
    ...existing,
    campaignName: input.campaignName.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    voucherBatches: toBatches(input, existing),
  };
  store = store.map((c) => (c.id === id ? updated : c));
  return view(updated);
}

// Chỉ cho đổi giữa ACTIVE và PAUSED. Các trạng thái khác đi theo luồng riêng của BE.
export async function setCampaignStatus(
  id: number,
  status: "ACTIVE" | "PAUSED",
): Promise<CampaignResponse> {
  await wait(400);
  const existing = store.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");
  if (resolveStatus(existing) === "ENDED") {
    throw new Error("Chiến dịch đã kết thúc, không thể đổi trạng thái");
  }
  const updated: CampaignResponse = { ...existing, status };
  store = store.map((c) => (c.id === id ? updated : c));
  return view(updated);
}

export async function listRules(): Promise<BatchRuleOption[]> {
  await wait(200);
  return MOCK_RULES;
}

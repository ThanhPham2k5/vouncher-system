import { MOCK_CAMPAIGNS, MOCK_RULES } from "./mock-data";
import type {
  BatchRuleOption,
  Campaign,
  CampaignInput,
  CampaignStatus,
} from "./types";

// Dữ liệu nằm trong bộ nhớ của trình duyệt, tải lại trang sẽ về dữ liệu mẫu ban đầu.
// Khi backend có API chiến dịch, thay từng hàm bằng fetch tới BACKEND_URL qua route handler.
let store: Campaign[] = structuredClone(MOCK_CAMPAIGNS);

function wait(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone(campaign: Campaign): Campaign {
  return structuredClone(campaign);
}

function buildCampaign(
  input: CampaignInput,
  status: CampaignStatus,
  previous?: Campaign,
): Campaign {
  return {
    id: input.id,
    name: input.name.trim(),
    description: input.description.trim(),
    status,
    adminId: previous?.adminId ?? "ADM_SUPER_089",
    startTime: input.startTime,
    endTime: input.endTime,
    budgetTotal: input.budgetTotal,
    budgetThreshold: input.budgetThreshold,
    budgetSpent: previous?.budgetSpent ?? 0,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    batches: input.batches.map((batch, index) => {
      const old = previous?.batches.find((b) => b.id === batch.id);
      return {
        ...batch,
        id:
          batch.id ?? `BATCH_${input.id}_${String(index + 1).padStart(2, "0")}`,
        generatedCount: old?.generatedCount ?? 0,
        redeemedCount: old?.redeemedCount ?? 0,
      };
    }),
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  await wait();
  return store.map(clone);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  await wait(300);
  const found = store.find((c) => c.id === id);
  return found ? clone(found) : null;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  await wait();
  if (store.some((c) => c.id === input.id)) {
    throw new Error(`Mã chiến dịch ${input.id} đã tồn tại`);
  }
  const campaign = buildCampaign(input, "ACTIVE");
  store = [campaign, ...store];
  return clone(campaign);
}

export async function updateCampaign(
  id: string,
  input: CampaignInput,
): Promise<Campaign> {
  await wait();
  const existing = store.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");
  const updated = buildCampaign({ ...input, id }, existing.status, existing);
  store = store.map((c) => (c.id === id ? updated : c));
  return clone(updated);
}

export async function setCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<Campaign> {
  await wait(400);
  const existing = store.find((c) => c.id === id);
  if (!existing) throw new Error("Không tìm thấy chiến dịch");
  const updated: Campaign = { ...existing, status };
  store = store.map((c) => (c.id === id ? updated : c));
  return clone(updated);
}

export async function listRules(): Promise<BatchRuleOption[]> {
  await wait(200);
  return MOCK_RULES;
}

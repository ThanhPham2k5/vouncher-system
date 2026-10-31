import { aggregate } from "./metrics";
import type {
  CampaignPerformance,
  DailyPoint,
  DashboardData,
  DateRange,
} from "./types";

// Dữ liệu mẫu toàn thời gian. Các giá trị khớp với mockup để dễ đối chiếu.
const BASE_CAMPAIGNS: CampaignPerformance[] = [
  {
    id: "camp-flash-sale",
    name: "Flash Sale Hè 2025",
    batchCode: "BATCH_FLASH_SALE",
    createdAt: "2025-06-01T09:00:00",
    cost: 48_200_000,
    revenue: 486_500_000,
    issued: 10_000,
    redeemed: 9_200,
  },
  {
    id: "camp-vip-loyal",
    name: "Khách hàng thân thiết VIP",
    batchCode: "BATCH_VIP_LOYAL",
    createdAt: "2025-05-12T08:00:00",
    cost: 32_500_000,
    revenue: 315_800_000,
    issued: 5_000,
    redeemed: 4_590,
  },
  {
    id: "camp-tech-1010",
    name: "Đại tiệc Công nghệ 10.10",
    batchCode: "BATCH_MEGA_T10",
    createdAt: "2025-10-01T10:00:00",
    cost: 64_000_000,
    revenue: 542_000_000,
    issued: 8_000,
    redeemed: 7_000,
  },
  {
    id: "camp-weekend",
    name: "Siêu Sale Cuối Tuần",
    batchCode: "BATCH_WEEKEND",
    createdAt: "2025-08-02T12:00:00",
    cost: 38_700_000,
    revenue: 284_200_000,
    issued: 6_000,
    redeemed: 5_340,
  },
  {
    id: "camp-new-user",
    name: "Ưu đãi khách hàng mới (NEWBIE)",
    batchCode: "BATCH_NEW_USER",
    createdAt: "2025-09-15T07:30:00",
    cost: 35_000_000,
    revenue: 214_000_000,
    issued: 9_000,
    redeemed: 7_200,
  },
];

const BASE_FRAUD = {
  success: 36_417,
  blocked: 4_130,
  failed: 1_603,
  reasons: [
    { label: "Giả lập Android x86", count: 1_942 },
    { label: "Trùng lặp IP", count: 1_280 },
    { label: "Device Fingerprint", count: 908 },
  ],
};

// Tỷ lệ của từng khoảng thời gian so với toàn thời gian
const RANGE_SCALE: Record<DateRange, number> = {
  "7d": 0.12,
  month: 0.4,
  all: 1,
};

// Phân bổ doanh thu theo từng cột biểu đồ (tổng bằng 1)
const RANGE_BUCKETS: Record<DateRange, { label: string; weight: number }[]> = {
  "7d": [
    { label: "T2", weight: 0.12 },
    { label: "T3", weight: 0.13 },
    { label: "T4", weight: 0.12 },
    { label: "T5", weight: 0.15 },
    { label: "T6", weight: 0.16 },
    { label: "T7", weight: 0.17 },
    { label: "CN", weight: 0.15 },
  ],
  month: [
    { label: "Tuần 1", weight: 0.18 },
    { label: "Tuần 2", weight: 0.22 },
    { label: "Tuần 3", weight: 0.27 },
    { label: "Tuần 4", weight: 0.33 },
  ],
  all: [
    { label: "T1", weight: 0.04 },
    { label: "T2", weight: 0.05 },
    { label: "T3", weight: 0.065 },
    { label: "T4", weight: 0.075 },
    { label: "T5", weight: 0.08 },
    { label: "T6", weight: 0.085 },
    { label: "T7", weight: 0.09 },
    { label: "T8", weight: 0.095 },
    { label: "T9", weight: 0.1 },
    { label: "T10", weight: 0.105 },
    { label: "T11", weight: 0.11 },
    { label: "T12", weight: 0.105 },
  ],
};

export function buildMockDashboard(range: DateRange): DashboardData {
  const scale = RANGE_SCALE[range];

  const campaigns = BASE_CAMPAIGNS.map((c) => ({
    ...c,
    cost: Math.round(c.cost * scale),
    revenue: Math.round(c.revenue * scale),
    issued: Math.round(c.issued * scale),
    redeemed: Math.round(c.redeemed * scale),
  }));

  const totals = aggregate(campaigns);
  const daily: DailyPoint[] = RANGE_BUCKETS[range].map((b) => ({
    label: b.label,
    revenue: Math.round(totals.revenue * b.weight),
    cost: Math.round(totals.cost * b.weight),
  }));

  return {
    campaigns,
    daily,
    fraud: {
      success: Math.round(BASE_FRAUD.success * scale),
      blocked: Math.round(BASE_FRAUD.blocked * scale),
      failed: Math.round(BASE_FRAUD.failed * scale),
      reasons: BASE_FRAUD.reasons.map((r) => ({
        label: r.label,
        count: Math.round(r.count * scale),
      })),
    },
  };
}

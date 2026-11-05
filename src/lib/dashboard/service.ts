import { fetchCampaigns } from "@/lib/api/campaigns";
import { listFraudLogs } from "@/lib/api/fraud";
import { listRedemptionLogs } from "@/lib/api/redemptions";
import {
  getCampaignIncrementalRevenue,
  getCampaignRedemptionRate,
} from "@/lib/api/statistics";
import { listVoucherBatches } from "@/lib/api/voucher-batches";
import type {
  FraudLogResponse,
  RedemptionLogResponse,
} from "@/lib/campaigns/be-types";
import type {
  CampaignPerformance,
  DailyPoint,
  DashboardData,
  DateRange,
  FraudSummary,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function dayLabel(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
function monthLabel(d: Date): string {
  return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Mốc bắt đầu khoảng thời gian, null nghĩa là toàn bộ thời gian
function rangeStart(range: DateRange, now: Date): number | null {
  if (range === "all") return null;
  return now.getTime() - (range === "7d" ? 7 : 30) * DAY_MS;
}

// BE trả LocalDateTime (không có múi giờ), Date.parse hiểu theo giờ địa phương
function inRange(createAt: string, start: number | null): boolean {
  if (start === null) return true;
  const t = Date.parse(createAt);
  return !Number.isNaN(t) && t >= start;
}

// Biểu đồ: 7 hoặc 30 ngày theo ngày, toàn thời gian theo tháng. Chỉ tính đơn SUCCESS.
function buildDaily(
  logs: RedemptionLogResponse[],
  range: DateRange,
  now: Date,
): DailyPoint[] {
  const monthly = range === "all";
  const start = rangeStart(range, now);
  const points = new Map<string, DailyPoint>();

  if (!monthly) {
    const days = range === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      points.set(dayKey(d), { label: dayLabel(d), revenue: 0, cost: 0 });
    }
  }

  for (const log of logs) {
    if (log.status !== "SUCCESS" || !inRange(log.createAt, start)) continue;
    const at = new Date(log.createAt);
    const key = monthly ? monthKey(at) : dayKey(at);
    const point = points.get(key) ?? {
      label: monthly ? monthLabel(at) : dayLabel(at),
      revenue: 0,
      cost: 0,
    };
    point.revenue += log.finalAmount;
    point.cost += log.discountAmount;
    points.set(key, point);
  }

  return [...points.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point);
}

// blocked = số lần fraud guard/rate limit ghi nhận (fraud-logs). failed = đơn FAILED trong redemption logs.
function buildFraud(
  redemptions: RedemptionLogResponse[],
  frauds: FraudLogResponse[],
  range: DateRange,
  now: Date,
): FraudSummary {
  const start = rangeStart(range, now);
  const recent = redemptions.filter((l) => inRange(l.createAt, start));
  const blockedLogs = frauds.filter((f) => inRange(f.createAt, start));

  const reasonCount = new Map<string, number>();
  for (const f of blockedLogs) {
    reasonCount.set(
      f.violationRule,
      (reasonCount.get(f.violationRule) ?? 0) + 1,
    );
  }

  return {
    success: recent.filter((l) => l.status === "SUCCESS").length,
    blocked: blockedLogs.length,
    failed: recent.filter((l) => l.status === "FAILED").length,
    reasons: [...reasonCount.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function fetchDashboard(range: DateRange): Promise<DashboardData> {
  const now = new Date();
  const [campaigns, batches, redemptions, frauds] = await Promise.all([
    fetchCampaigns(),
    listVoucherBatches(),
    listRedemptionLogs(),
    listFraudLogs(),
  ]);

  // Mỗi chiến dịch gọi 2 endpoint thống kê (tổng số lượng gọi = 2 × số chiến dịch)
  const performance: CampaignPerformance[] = await Promise.all(
    campaigns.map(async (c) => {
      const [rate, revenue] = await Promise.all([
        getCampaignRedemptionRate(c.id),
        getCampaignIncrementalRevenue(c.id),
      ]);
      const prefix = batches.find((b) => b.campaignId === c.id)?.codeConfig
        .prefix;
      return {
        id: String(c.id),
        name: c.name,
        batchCode: prefix ?? "—",
        // BE không lưu thời điểm tạo chiến dịch, dùng thời gian bắt đầu thay thế
        createAt: c.startTime,
        cost: revenue.campaignSummary.totalDiscountAmount,
        revenue: revenue.campaignSummary.totalFinalAmount,
        issued: rate.campaignSummary.totalIssued,
        redeemed: rate.campaignSummary.totalRedeemed,
      };
    }),
  );

  return {
    campaigns: performance,
    daily: buildDaily(redemptions, range, now),
    fraud: buildFraud(redemptions, frauds, range, now),
  };
}

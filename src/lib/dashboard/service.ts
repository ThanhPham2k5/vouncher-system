import { fetchCampaigns } from "@/lib/api/campaigns";
import { listFraudLogs } from "@/lib/api/fraud";
import { listRedemptionLogs } from "@/lib/api/redemptions";
import {
  getDashboardOverview,
  getRevenueTimeSeries,
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

// BE tính bucket và khoảng thời gian theo múi giờ này. Mọi mốc gửi lên BE dùng cùng múi giờ.
const SERVER_TZ = "Asia/Ho_Chi_Minh";
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: SERVER_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function serverDay(now: Date): string {
  return DAY_FORMAT.format(now);
}

function shiftDay(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Khoảng [from, to) gửi lên BE, đều là 00:00 theo giờ server
function rangeBounds(
  range: DateRange,
  now: Date,
): { from: string; to: string } {
  const today = serverDay(now);
  const to = `${shiftDay(today, 1)}T00:00:00`;
  if (range === "7d") {
    return { from: `${shiftDay(today, -6)}T00:00:00`, to };
  }
  if (range === "month") {
    return { from: `${today.slice(0, 8)}01T00:00:00`, to };
  }
  // "all": BE giới hạn 366 ngày cho granularity DAY
  return { from: `${shiftDay(today, -365)}T00:00:00`, to };
}

// Biểu đồ: theo ngày (7 ngày, tháng này) hoặc theo tháng (12 tháng qua).
// BE đã điền các ngày trống bằng 0.
async function fetchDailySeries(
  range: DateRange,
  now: Date,
): Promise<DailyPoint[]> {
  const { from, to } = rangeBounds(range, now);
  const series = await getRevenueTimeSeries({ granularity: "DAY", from, to });

  const monthly = range === "all";
  const points = new Map<string, DailyPoint>();

  for (const p of series.points) {
    const y = p.bucket.slice(0, 4);
    const m = p.bucket.slice(5, 7);
    const d = p.bucket.slice(8, 10);
    const key = monthly ? `${y}-${m}` : `${y}-${m}-${d}`;
    const point = points.get(key) ?? {
      label: monthly ? `${m}/${y}` : `${d}/${m}`,
      revenue: 0,
      cost: 0,
      redemptions: 0,
    };
    point.revenue += p.finalAmount;
    point.cost += p.discountAmount;
    point.redemptions = (point.redemptions ?? 0) + p.redemptionCount;
    points.set(key, point);
  }

  return [...points.values()];
}

// Mốc bắt đầu cho thống kê fraud. BE trả LocalDateTime nên Date.parse hiểu theo giờ địa phương.
function fraudStart(range: DateRange, now: Date): number {
  return Date.parse(rangeBounds(range, now).from);
}

function inRange(createAt: string, start: number): boolean {
  const t = Date.parse(createAt);
  return !Number.isNaN(t) && t >= start;
}

// blocked = lượt bị luật chặn (fraud-logs). failed = lượt FAILED trong redemption logs.
// Hai nhóm này có thể trùng nhau nếu một lượt vừa bị chặn vừa được ghi FAILED.
function buildFraud(
  redemptions: RedemptionLogResponse[],
  frauds: FraudLogResponse[],
  range: DateRange,
  now: Date,
): FraudSummary {
  const start = fraudStart(range, now);
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

// Tải đầy đủ: danh sách chiến dịch, lô, fraud và số liệu
export async function fetchDashboard(range: DateRange): Promise<DashboardData> {
  const now = new Date();
  const [campaigns, batches, redemptions, frauds, overview, daily] =
    await Promise.all([
      fetchCampaigns(),
      listVoucherBatches(),
      // Chỉ dùng cho thống kê fraud (success/failed). Sẽ chuyển sang phân trang sau.
      listRedemptionLogs(),
      listFraudLogs(),
      getDashboardOverview(),
      fetchDailySeries(range, now),
    ]);

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  const performance: CampaignPerformance[] = overview.campaigns.map((o) => {
    const id = Number(o.campaignId);
    const campaign = campaignById.get(id);
    const prefix = batches.find((b) => b.campaignId === id)?.codeConfig.prefix;
    return {
      id: o.campaignId,
      name: o.campaignName,
      batchCode: prefix ?? "—",
      // BE không lưu thời điểm tạo chiến dịch, dùng thời gian bắt đầu thay thế
      createAt: campaign?.startTime ?? "",
      cost: o.totalDiscountAmount,
      revenue: o.totalFinalAmount,
      issued: o.issuedCount,
      redeemed: o.redeemedCount,
      distributed: o.distributedCount,
    };
  });

  return {
    campaigns: performance,
    daily,
    fraud: buildFraud(redemptions, frauds, range, now),
  };
}

// Làm mới nhanh khi có sự kiện realtime: chỉ tải overview và timeseries.
// Giữ nguyên danh sách chiến dịch và fraud của lần tải đầy đủ gần nhất.
export async function refreshDashboardLive(
  range: DateRange,
  previous: DashboardData,
): Promise<DashboardData> {
  const now = new Date();
  const [overview, daily] = await Promise.all([
    getDashboardOverview(),
    fetchDailySeries(range, now),
  ]);

  const byId = new Map(overview.campaigns.map((o) => [o.campaignId, o]));
  const campaigns = previous.campaigns.map((c) => {
    const o = byId.get(c.id);
    if (!o) return c;
    return {
      ...c,
      cost: o.totalDiscountAmount,
      revenue: o.totalFinalAmount,
      issued: o.issuedCount,
      redeemed: o.redeemedCount,
      distributed: o.distributedCount,
    };
  });

  return { campaigns, daily, fraud: previous.fraud };
}

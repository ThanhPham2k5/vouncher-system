// BE: GET /statistic/campaigns/{campaignId}/redemption-rate
//     GET /statistic/campaigns/{campaignId}/incremental-revenue
//     GET /statistic/overview
//     GET /statistic/timeseries
// Tùy chọn: batchId, includeCodes, baselineRevenue, granularity, from, to, campaignId.
import { adminRequest } from "./http";

// ---------- Redemption rate ----------

export interface CodeRedemptionStats {
  code: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  distributedCount: number;
  // đã dùng / đã phân phối (%)
  distributedRedemptionRate: number;
}

export interface BatchRedemptionStats {
  batchId: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  distributedCount: number;
  distributedRedemptionRate: number;
  codes: CodeRedemptionStats[];
}

export interface CampaignRedemptionSummary {
  totalIssued: number;
  totalRedeemed: number;
  redemptionRate: number;
  totalDistributed: number;
  distributedRedemptionRate: number;
}

export interface CampaignRedemptionStats {
  campaignId: string;
  campaignName: string;
  campaignSummary: CampaignRedemptionSummary;
  batches: BatchRedemptionStats[];
}

// ---------- Incremental revenue & ROI ----------

export interface CodeRevenueStats {
  code: string;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  roi: number;
}

export interface BatchRevenueStats {
  batchId: string;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  roi: number;
  codes: CodeRevenueStats[];
}

export interface CampaignRevenueSummary {
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  // doanh thu đối chứng đã truyền vào (0 nếu không truyền)
  baselineRevenue: number;
  // totalFinalAmount − baselineRevenue
  incrementalRevenue: number;
  // (incrementalRevenue − totalDiscountAmount) / totalDiscountAmount × 100
  roi: number;
}

export interface CampaignRevenueStats {
  campaignId: string;
  campaignName: string;
  campaignSummary: CampaignRevenueSummary;
  batches: BatchRevenueStats[];
}

export interface StatisticOptions {
  batchId?: number;
  includeCodes?: boolean;
}

export interface IncrementalRevenueOptions extends StatisticOptions {
  // Doanh thu đối chứng cùng phạm vi thống kê (ước tính nếu không chạy chiến dịch)
  baselineRevenue?: number;
}

export function getCampaignRedemptionRate(
  campaignId: number,
  options: StatisticOptions = {},
): Promise<CampaignRedemptionStats> {
  return adminRequest<CampaignRedemptionStats>(
    `statistic/campaigns/${campaignId}/redemption-rate`,
    { query: { batchId: options.batchId, includeCodes: options.includeCodes } },
  );
}

export function getCampaignIncrementalRevenue(
  campaignId: number,
  options: IncrementalRevenueOptions = {},
): Promise<CampaignRevenueStats> {
  return adminRequest<CampaignRevenueStats>(
    `statistic/campaigns/${campaignId}/incremental-revenue`,
    {
      query: {
        batchId: options.batchId,
        includeCodes: options.includeCodes,
        baselineRevenue: options.baselineRevenue,
      },
    },
  );
}

// ---------- Overview ----------

export interface DashboardOverviewSummary {
  totalIssued: number;
  totalRedeemed: number;
  redemptionRate: number;
  totalDistributed: number;
  distributedRedemptionRate: number;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  roi: number;
}

export interface CampaignOverviewStats {
  campaignId: string;
  campaignName: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  distributedCount: number;
  distributedRedemptionRate: number;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  roi: number;
}

export interface CodeOverviewStats {
  campaignId: string;
  batchId: string;
  code: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  distributedCount: number;
  distributedRedemptionRate: number;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  roi: number;
}

export interface DashboardOverview {
  summary: DashboardOverviewSummary;
  campaigns: CampaignOverviewStats[];
  codes: CodeOverviewStats[];
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return adminRequest<DashboardOverview>("statistic/overview");
}

// ---------- Timeseries doanh thu ----------

export type TimeGranularity = "HOUR" | "DAY";

export interface RevenueTimeSeriesPoint {
  // LocalDateTime theo giờ server, ví dụ "2026-11-07T00:00:00"
  bucket: string;
  redemptionCount: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface RevenueTimeSeries {
  granularity: TimeGranularity;
  from: string;
  to: string;
  campaignId: string | null;
  // BE đã điền các bucket trống bằng 0, sắp xếp tăng dần theo thời gian
  points: RevenueTimeSeriesPoint[];
}

export interface TimeSeriesOptions {
  granularity?: TimeGranularity;
  // "yyyy-MM-ddTHH:mm:ss", theo giờ server. from bao gồm, to không bao gồm.
  from?: string;
  to?: string;
  campaignId?: number;
}

// Giới hạn BE: HOUR tối đa 31 ngày, DAY tối đa 366 ngày.
export function getRevenueTimeSeries(
  options: TimeSeriesOptions = {},
): Promise<RevenueTimeSeries> {
  return adminRequest<RevenueTimeSeries>("statistic/timeseries", {
    query: {
      granularity: options.granularity,
      from: options.from,
      to: options.to,
      campaignId: options.campaignId,
    },
  });
}

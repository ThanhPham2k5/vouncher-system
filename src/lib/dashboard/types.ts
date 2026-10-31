// Cấu trúc bám theo entity Campaign / VoucherBatch / RedemptionLog của backend
export type DateRange = "7d" | "month" | "all";

export type SortKey =
  | "roi_desc"
  | "roi_asc"
  | "revenue_desc"
  | "cost_desc"
  | "redemption_desc"
  | "newest";

export interface CampaignPerformance {
  id: string;
  name: string;
  batchCode: string;
  createdAt: string; // ISO datetime
  cost: number; // chi phí chiết khấu (discount)
  revenue: number; // doanh thu thu về (final amount)
  issued: number; // số mã đã sinh
  redeemed: number; // số mã đã dùng
}

export interface DailyPoint {
  label: string;
  revenue: number;
  cost: number;
}

export interface FraudReason {
  label: string;
  count: number;
}

export interface FraudSummary {
  success: number;
  blocked: number;
  failed: number;
  reasons: FraudReason[];
}

export interface DashboardData {
  campaigns: CampaignPerformance[];
  daily: DailyPoint[];
  fraud: FraudSummary;
}

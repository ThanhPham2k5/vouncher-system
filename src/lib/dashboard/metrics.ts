import type { CampaignPerformance, SortKey } from "./types";

export interface Totals {
  cost: number;
  revenue: number;
  issued: number;
  redeemed: number;
  distributed: number;
  // Doanh thu có mã / tiền giảm (lần). null khi chưa có tiền giảm.
  ratio: number | null;
  // (ratio − 1) × 100. Là cận trên khi chưa có đối chứng.
  roi: number;
  // Đã dùng / quota (%)
  redemptionRate: number;
  // Đã dùng / số lượt đã gửi qua kênh phân phối (%). null khi chưa có lượt gửi.
  distributedRate: number | null;
}

// Doanh thu có mã / tiền giảm (lần). Không có giả định về doanh thu tăng thêm.
export function calcRevenueRatio(cost: number, revenue: number): number | null {
  return cost === 0 ? null : revenue / cost;
}

// (Doanh thu − Chi phí) / Chi phí × 100, khớp với BE. Là cận trên khi chưa có đối chứng.
export function calcRoi(cost: number, revenue: number): number {
  return cost === 0 ? 0 : ((revenue - cost) / cost) * 100;
}

export function calcRedemptionRate(issued: number, redeemed: number): number {
  return issued === 0 ? 0 : (redeemed / issued) * 100;
}

// Đã dùng / đã gửi. Chỉ tính lượt gửi qua kênh phân phối, không tính mã dùng trực tiếp trên web.
export function calcDistributedRate(
  distributed: number,
  redeemed: number,
): number | null {
  return distributed === 0 ? null : (redeemed / distributed) * 100;
}

const RATIO_FORMAT = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatRatio(value: number | null): string {
  return value === null ? "—" : `${RATIO_FORMAT.format(value)}×`;
}

export function aggregate(list: CampaignPerformance[]): Totals {
  const cost = list.reduce((sum, c) => sum + c.cost, 0);
  const revenue = list.reduce((sum, c) => sum + c.revenue, 0);
  const issued = list.reduce((sum, c) => sum + c.issued, 0);
  const redeemed = list.reduce((sum, c) => sum + c.redeemed, 0);

  // Chỉ cộng các chiến dịch có số liệu phân phối, để tỷ lệ không bị lệch
  const withDistribution = list.filter((c) => c.distributed !== undefined);
  const distributed = withDistribution.reduce(
    (sum, c) => sum + (c.distributed ?? 0),
    0,
  );
  const redeemedWithDistribution = withDistribution.reduce(
    (sum, c) => sum + c.redeemed,
    0,
  );

  return {
    cost,
    revenue,
    issued,
    redeemed,
    distributed,
    ratio: calcRevenueRatio(cost, revenue),
    roi: calcRoi(cost, revenue),
    redemptionRate: calcRedemptionRate(issued, redeemed),
    distributedRate: calcDistributedRate(distributed, redeemedWithDistribution),
  };
}

export function sortCampaigns(
  list: CampaignPerformance[],
  key: SortKey,
): CampaignPerformance[] {
  const items = [...list];
  switch (key) {
    case "roi_desc":
      return items.sort(
        (a, b) => calcRoi(b.cost, b.revenue) - calcRoi(a.cost, a.revenue),
      );
    case "roi_asc":
      return items.sort(
        (a, b) => calcRoi(a.cost, a.revenue) - calcRoi(b.cost, b.revenue),
      );
    case "revenue_desc":
      return items.sort((a, b) => b.revenue - a.revenue);
    case "cost_desc":
      return items.sort((a, b) => b.cost - a.cost);
    case "redemption_desc":
      return items.sort(
        (a, b) =>
          calcRedemptionRate(b.issued, b.redeemed) -
          calcRedemptionRate(a.issued, a.redeemed),
      );
    case "newest":
      return items.sort((a, b) => b.createAt.localeCompare(a.createAt));
  }
}

import type { CampaignPerformance, SortKey } from "./types";

export interface Totals {
  cost: number;
  revenue: number;
  issued: number;
  redeemed: number;
  roi: number;
  redemptionRate: number;
}

// ROI = (Doanh thu - Chi phí) / Chi phí × 100
export function calcRoi(cost: number, revenue: number): number {
  return cost === 0 ? 0 : ((revenue - cost) / cost) * 100;
}

export function calcRedemptionRate(issued: number, redeemed: number): number {
  return issued === 0 ? 0 : (redeemed / issued) * 100;
}

export function aggregate(list: CampaignPerformance[]): Totals {
  const cost = list.reduce((sum, c) => sum + c.cost, 0);
  const revenue = list.reduce((sum, c) => sum + c.revenue, 0);
  const issued = list.reduce((sum, c) => sum + c.issued, 0);
  const redeemed = list.reduce((sum, c) => sum + c.redeemed, 0);
  return {
    cost,
    revenue,
    issued,
    redeemed,
    roi: calcRoi(cost, revenue),
    redemptionRate: calcRedemptionRate(issued, redeemed),
  };
}

export type RatingTone = "excellent" | "good" | "needs-work";

// Ngưỡng đánh giá là quy ước tạm, chỉnh tại đây nếu nhóm thống nhất khác
export function rateCampaign(roi: number): { label: string; tone: RatingTone } {
  if (roi >= 700) return { label: "Xuất sắc", tone: "excellent" };
  if (roi >= 500) return { label: "Tốt", tone: "good" };
  return { label: "Cần tối ưu", tone: "needs-work" };
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
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

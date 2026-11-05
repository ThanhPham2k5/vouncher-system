// BE: GET /statistic/campaigns/{campaignId}/redemption-rate
//     GET /statistic/campaigns/{campaignId}/incremental-revenue
// Tùy chọn: batchId, includeCodes.
import { adminRequest } from "./http";

export interface CodeRedemptionStats {
  code: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
}

export interface BatchRedemptionStats {
  batchId: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  codes: CodeRedemptionStats[];
}

export interface CampaignRedemptionSummary {
  totalIssued: number;
  totalRedeemed: number;
  redemptionRate: number;
}

export interface CampaignRedemptionStats {
  campaignId: string;
  campaignName: string;
  campaignSummary: CampaignRedemptionSummary;
  batches: BatchRedemptionStats[];
}

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
  options: StatisticOptions = {},
): Promise<CampaignRevenueStats> {
  return adminRequest<CampaignRevenueStats>(
    `statistic/campaigns/${campaignId}/incremental-revenue`,
    { query: { batchId: options.batchId, includeCodes: options.includeCodes } },
  );
}

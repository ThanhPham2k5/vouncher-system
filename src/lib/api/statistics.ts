// Mock theo spec "Statistics": GET /statistics/roi/{campaign_id}.
// Spec khai báo RoiResponse chỉ có "gross". Mock tính gross là tổng finalAmount các lần đổi mã thành công của chiến dịch.
// Spec ghi type array cho response, mock trả về một object vì đây là thống kê một chiến dịch.
import { getCampaign } from "@/lib/campaigns/service";
import type { RoiResponse } from "@/lib/campaigns/be-types";
import { notFound, wait } from "./common";
import { getRedemptionsSnapshot } from "./redemptions";
import { getVouchersSnapshot } from "./vouchers";

export async function getCampaignRoi(campaignId: number): Promise<RoiResponse> {
  await wait(300);
  const campaign = await getCampaign(campaignId);
  if (!campaign) notFound("chiến dịch");

  const campaignOfVoucher = new Map(
    getVouchersSnapshot().map((v) => [v.id, v.campaignId]),
  );
  const gross = getRedemptionsSnapshot()
    .filter(
      (l) =>
        l.status === "SUCCESS" &&
        campaignOfVoucher.get(l.voucherId) === campaignId,
    )
    .reduce((sum, l) => sum + l.finalAmount, 0);

  return { gross };
}

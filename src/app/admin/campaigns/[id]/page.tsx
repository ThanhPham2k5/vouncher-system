import { AdminShell } from "@/components/admin/admin-shell";
import { CampaignDetail } from "@/components/campaigns/campaign-detail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell>
      <CampaignDetail campaignId={Number(id)} />
    </AdminShell>
  );
}

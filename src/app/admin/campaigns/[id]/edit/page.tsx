import { AdminShell } from "@/components/admin/admin-shell";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell>
      <CampaignForm mode="edit" campaignId={Number(id)} />
    </AdminShell>
  );
}

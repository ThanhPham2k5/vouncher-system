import { AdminShell } from "@/components/admin/admin-shell";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default function NewCampaignPage() {
  return (
    <AdminShell>
      <CampaignForm mode="create" />
    </AdminShell>
  );
}

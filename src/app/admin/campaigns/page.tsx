import { AdminShell } from "@/components/admin/admin-shell";
import { CampaignsView } from "@/components/campaigns/campaigns-view";

export default function AdminCampaignsPage() {
  return (
    <AdminShell>
      <CampaignsView />
    </AdminShell>
  );
}

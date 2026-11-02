import { AdminShell } from "@/components/admin/admin-shell";
import { DistributionView } from "@/components/distribution/distribution-view";

export default function AdminDistributionPage() {
  return (
    <AdminShell>
      <DistributionView />
    </AdminShell>
  );
}

import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <DashboardView />
    </AdminShell>
  );
}

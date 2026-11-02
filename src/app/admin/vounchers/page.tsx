import { AdminShell } from "@/components/admin/admin-shell";
import { VouchersView } from "@/components/vounchers/vouchers-view";

export default function AdminVouchersPage() {
  return (
    <AdminShell>
      <VouchersView />
    </AdminShell>
  );
}

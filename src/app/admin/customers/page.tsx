import { AdminShell } from "@/components/admin/admin-shell";
import { CustomersView } from "@/components/customers/customers-view";

export default function AdminCustomersPage() {
  return (
    <AdminShell>
      <CustomersView />
    </AdminShell>
  );
}

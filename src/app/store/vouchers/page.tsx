import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/store/store-header";
import { VouchersView } from "@/components/store/vouchers-view";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";
import { customerIdOf } from "@/lib/store-customers";

export default async function StoreVouchersPage() {
  const username = (await cookies()).get(STORE_SESSION_COOKIE)?.value;
  if (!username) redirect("/store/login");

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader username={username} />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <VouchersView customerId={customerIdOf(username)} />
      </main>
    </div>
  );
}

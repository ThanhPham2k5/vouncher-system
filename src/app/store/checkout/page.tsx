import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/store/checkout-view";
import { StoreHeader } from "@/components/store/store-header";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";
import { customerIdOf } from "@/lib/store-customers";

export default async function StoreCheckoutPage() {
  const username = (await cookies()).get(STORE_SESSION_COOKIE)?.value;
  if (!username) redirect("/store/login");

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader username={username} />
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Thanh toán và áp mã khuyến mãi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kiểm tra giỏ hàng, chọn mã giảm giá trong kho và xác nhận đặt hàng.
          </p>
        </div>
        <CheckoutView customerId={customerIdOf(username)} />
      </main>
    </div>
  );
}

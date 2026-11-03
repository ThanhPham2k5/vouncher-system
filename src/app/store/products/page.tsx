import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductsView } from "@/components/store/products-view";
import { StoreHeader } from "@/components/store/store-header";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";

export default async function StoreProductsPage() {
  const username = (await cookies()).get(STORE_SESSION_COOKIE)?.value;
  if (!username) redirect("/store/login");

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader username={username} />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <ProductsView />
      </main>
    </div>
  );
}

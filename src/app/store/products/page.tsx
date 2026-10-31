import { AppHeader } from "@/components/app-header";

export default function StoreProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        brand="PromoStore"
        subtitle="Storefront"
        logoutEndpoint="/api/store/logout"
        loginPath="/store/login"
      />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Sản phẩm</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập thành công. Danh sách sản phẩm sẽ được bổ sung sau.</p>
      </main>
    </div>
  );
}

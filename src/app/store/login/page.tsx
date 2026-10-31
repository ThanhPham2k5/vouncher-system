import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function StoreLoginPage() {
  return (
    <AuthShell brand="PromoStore" title="Đăng nhập tài khoản" subtitle="Đăng nhập để săn mã và áp dụng ưu đãi">
      <LoginForm
        endpoint="/api/store/login"
        redirectTo="/store/products"
        usernameLabel="Tên đăng nhập / Số điện thoại"
        usernamePlaceholder="ví dụ: nguyenvana"
        submitLabel="Bắt đầu mua sắm & áp mã"
      />
    </AuthShell>
  );
}

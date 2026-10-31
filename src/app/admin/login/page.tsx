import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function AdminLoginPage() {
  return (
    <AuthShell brand="PromoCloud Admin Console" title="Đăng nhập quản trị" subtitle="Chỉ dành cho nhân viên được cấp quyền">
      <LoginForm
        endpoint="/api/admin/login"
        redirectTo="/admin/dashboard"
        usernameLabel="Tên đăng nhập"
        usernamePlaceholder="ví dụ: admin"
        submitLabel="Truy cập bảng điều khiển"
      />
    </AuthShell>
  );
}

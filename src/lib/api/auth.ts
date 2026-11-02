// Mock theo spec "Authentication": /auth/refresh và /auth/change-password.
// Đăng nhập và đăng xuất đã nằm ở route handler (BFF), không mock ở đây.
import type {
  AuthResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
} from "@/lib/campaigns/be-types";
import { ApiError, badRequest, unauthorized, wait } from "./common";

const MOCK_CURRENT_PASSWORD = "adminpassword";

export async function refreshAuth(
  req: RefreshTokenRequest,
): Promise<AuthResponse> {
  await wait(300);
  if (!req.refreshToken.startsWith("mock-refresh-")) {
    unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
  }
  const now = Date.now();
  return {
    accessToken: `mock-access-${now}`,
    refreshToken: `mock-refresh-${now}`,
    tokenType: "bearer",
    accessExpiresAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    refreshExpiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function changePassword(
  req: ChangePasswordRequest,
): Promise<void> {
  await wait(300);
  if (req.currentPassword !== MOCK_CURRENT_PASSWORD) {
    throw new ApiError("Mật khẩu hiện tại không đúng", 400);
  }
  if (req.newPassword.length < 8) {
    badRequest("Mật khẩu mới phải có ít nhất 8 ký tự");
  }
}

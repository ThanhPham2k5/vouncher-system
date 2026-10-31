import { buildMockDashboard } from "./mock-data";
import type { DashboardData, DateRange } from "./types";

// Hiện tại trả về dữ liệu mẫu có độ trễ để thấy trạng thái loading.
// Khi backend có endpoint thống kê, thay thân hàm bằng fetch tới BACKEND_URL qua route handler.
export async function fetchDashboard(range: DateRange): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return buildMockDashboard(range);
}

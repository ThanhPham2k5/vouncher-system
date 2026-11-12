// MOCK: BE chưa quản lý khách hàng nên mock khách và id nằm ở FE.
// id là customerId gửi lên BE (kiểu String), phải khớp với id trong ví và lịch sử đổi mã.
// Các id dùng theo dữ liệu seed của BE (cust_101, cust_102...).
export interface MockCustomer {
  id: string;
  password: string;
  tier: "VIP" | "NORMAL";
}

export const MOCK_CUSTOMERS: Record<string, MockCustomer> = {
  nguyenvana: { id: "cust_101", password: "123456", tier: "VIP" },
  tranthib: { id: "cust_102", password: "123456", tier: "VIP" },
  nguyenvanc: { id: "cust_103", password: "123456", tier: "NORMAL" },
};

// Tra customerId từ username lưu trong cookie phiên
export function customerIdOf(
  username: string | undefined | null,
): string | null {
  if (!username) return null;
  return MOCK_CUSTOMERS[username]?.id ?? null;
}

// Phân khúc khách dùng để kiểm tra điều kiện CUSTOMER_SEGMENT (tier trùng với tên segment)
export function segmentsOfCustomerId(customerId: string | null): string[] {
  const customer = Object.values(MOCK_CUSTOMERS).find(
    (c) => c.id === customerId,
  );
  return customer ? [customer.tier] : [];
}

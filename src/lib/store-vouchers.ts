// MOCK: BE chưa có API voucher cho khách, spec chỉ có /vouchers (admin) và /vouchers/customer (mock).
// Ngày hết hạn tính từ hôm nay (expiresInDays) thay vì ngày cố định trong thiết kế (2025) để voucher không bị hết hạn.
// rule chỉ dùng để tính thử ở trang giỏ hàng. Máy chủ (BE) mới là nơi tính giảm giá chính thức.
import { wait } from "./api/common";
import { saveToWallet } from "./store-wallet";

export type VoucherKind = "PERCENT" | "FIXED" | "GIFT";

export const VOUCHER_KIND_LABEL: Record<VoucherKind, string> = {
  PERCENT: "Giảm phần trăm %",
  FIXED: "Giảm trực tiếp",
  GIFT: "Tặng quà",
};

export type VoucherRule =
  | { type: "PERCENT"; percent: number; cap: number; minBasket: number }
  | { type: "FIXED"; amount: number; minBasket: number }
  | { type: "GIFT"; minBasket: number };

export interface StoreVoucher {
  code: string;
  title: string;
  subtitle: string;
  kind: VoucherKind;
  headline: string;
  detail: string;
  condition: string;
  badge?: string;
  expiresAt: string; // ISO
  rule: VoucherRule;
}

interface VoucherSeed extends Omit<StoreVoucher, "expiresAt"> {
  expiresInDays: number;
}

const SEEDS: VoucherSeed[] = [
  {
    code: "FLASHSALE20",
    title: "Flash Sale Hè 2025",
    subtitle: "Toàn sàn PromoCloud",
    kind: "PERCENT",
    headline: "Giảm 20%",
    detail: "Tối đa 50.000 ₫",
    condition: "Đơn hàng tối thiểu 100.000 ₫ • Áp dụng toàn sàn",
    rule: { type: "PERCENT", percent: 20, cap: 50000, minBasket: 100000 },
    expiresInDays: 30,
  },
  {
    code: "NEWBIE30K",
    title: "Khách hàng mới",
    subtitle: "Ưu đãi chào mừng",
    kind: "FIXED",
    headline: "Giảm ngay 30.000 ₫",
    detail: "Trừ trực tiếp vào tổng thanh toán",
    condition: "Đơn hàng tối thiểu 150.000 ₫ • Chỉ dành cho đơn đầu tiên",
    badge: "Thành viên mới",
    rule: { type: "FIXED", amount: 30000, minBasket: 150000 },
    expiresInDays: 45,
  },
  {
    code: "VIP_GIFT2025",
    title: "Quà tặng VIP Combo",
    subtitle: "Ưu đãi quà tặng đặc quyền",
    kind: "GIFT",
    headline: "Tặng Quà 250.000 ₫",
    detail: "Tặng kèm Chuột Gaming không dây",
    condition: "Đơn hàng tối thiểu 500.000 ₫ • Quà tặng đính kèm giỏ hàng",
    badge: "Tặng kèm",
    rule: { type: "GIFT", minBasket: 500000 },
    expiresInDays: 60,
  },
  {
    code: "TECH50K",
    title: "Đại tiệc Công nghệ",
    subtitle: "Đồ điện tử & Phụ kiện",
    kind: "FIXED",
    headline: "Giảm 50.000 ₫",
    detail: "Áp dụng trực tiếp vào sản phẩm Tech",
    condition: "Đơn hàng tối thiểu 500.000 ₫ • Phụ kiện & Thiết bị",
    badge: "Chuyên ngành",
    rule: { type: "FIXED", amount: 50000, minBasket: 500000 },
    expiresInDays: 20,
  },
  {
    code: "WEEKEND15",
    title: "Siêu Sale Cuối Tuần",
    subtitle: "Chỉ diễn ra T7 & CN",
    kind: "PERCENT",
    headline: "Giảm 15%",
    detail: "Tối đa 70.000 ₫",
    condition: "Đơn hàng tối thiểu 250.000 ₫ • Áp dụng T7 & CN",
    badge: "Giới hạn giờ",
    rule: { type: "PERCENT", percent: 15, cap: 70000, minBasket: 250000 },
    expiresInDays: 25,
  },
  {
    code: "VIPLOYAL_100K",
    title: "Khách hàng thân thiết",
    subtitle: "Đặc quyền Gold VIP",
    kind: "FIXED",
    headline: "Giảm 100.000 ₫",
    detail: "Áp dụng trực tiếp vào hóa đơn",
    condition: "Đơn hàng tối thiểu 800.000 ₫ • Thành viên Gold trở lên",
    badge: "Hạng Gold+",
    rule: { type: "FIXED", amount: 100000, minBasket: 800000 },
    expiresInDays: 90,
  },
];

export async function listStoreVouchers(): Promise<StoreVoucher[]> {
  await wait(300);
  const now = Date.now();
  return SEEDS.map(({ expiresInDays, ...rest }) => ({
    ...rest,
    expiresAt: new Date(now + expiresInDays * 86_400_000).toISOString(),
  }));
}

// MOCK: spec POST /vouchers/customer. Hiện tại chỉ ghi vào kho trình duyệt.
export async function saveStoreVoucher(code: string): Promise<void> {
  await wait(300);
  saveToWallet(code);
}

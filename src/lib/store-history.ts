// MOCK: BE không có endpoint lịch sử theo khách. GET /redemptions/logs trả log của mọi khách và cần đăng nhập admin.
// Khi BE có endpoint cho khách (ví dụ GET /redemptions/me), thay hàm listStoreHistory bằng lời gọi thật.
import { wait } from "./api/common";

export interface RedemptionRecord {
  id: string;
  code: string;
  campaignTitle: string;
  originalAmount: number;
  discountAmount: number; // 0 khi bị chặn
  status: "SUCCESS" | "BLOCKED";
  blockedReason?: string;
  appliedAt: string; // ISO
  ruleType: string;
  minBasket: number;
  expiresAt: string; // ISO
  channel: string;
  transactionRef: string;
  ip: string;
  isp: string;
  device: string;
  trustScore: number;
  auditNote: string;
}

interface Seed extends Omit<RedemptionRecord, "appliedAt" | "expiresAt"> {
  hoursAgo: number;
}

const SEEDS: Seed[] = [
  {
    id: "1",
    code: "FLASHSALE20",
    campaignTitle: "Giảm 10% tối đa 200k",
    originalAmount: 2000000,
    discountAmount: 200000,
    status: "SUCCESS",
    hoursAgo: 4,
    ruleType: "PERCENTAGE",
    minBasket: 1000000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882910_01",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 96,
    auditNote:
      "Không phát hiện dấu hiệu spam voucher hoặc giả lập multi-account.",
  },
  {
    id: "2",
    code: "MEGA50K_8X91",
    campaignTitle: "Chiến dịch Mega Sale",
    originalAmount: 650000,
    discountAmount: 0,
    status: "BLOCKED",
    blockedReason: "Vượt giới hạn thiết bị",
    hoursAgo: 9,
    ruleType: "FIXED_AMOUNT",
    minBasket: 500000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882909_02",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 34,
    auditNote: "Thiết bị đã áp quá số lần cho phép trong ngày.",
  },
  {
    id: "3",
    code: "NEWBIE30K",
    campaignTitle: "Ưu đãi tài khoản mới",
    originalAmount: 280000,
    discountAmount: 30000,
    status: "SUCCESS",
    hoursAgo: 27,
    ruleType: "FIXED_AMOUNT",
    minBasket: 150000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882800_03",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 92,
    auditNote: "Không phát hiện dấu hiệu bất thường.",
  },
  {
    id: "4",
    code: "WEEKEND15",
    campaignTitle: "Vui cuối tuần deal hời",
    originalAmount: 550000,
    discountAmount: 70000,
    status: "SUCCESS",
    hoursAgo: 52,
    ruleType: "PERCENTAGE",
    minBasket: 250000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882701_04",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 90,
    auditNote: "Không phát hiện dấu hiệu bất thường.",
  },
  {
    id: "5",
    code: "VIPLOYAL_100K",
    campaignTitle: "Đặc quyền hạng VIP",
    originalAmount: 900000,
    discountAmount: 100000,
    status: "SUCCESS",
    hoursAgo: 76,
    ruleType: "FIXED_AMOUNT",
    minBasket: 800000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882650_05",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 98,
    auditNote: "Tài khoản thân thiết, không có cảnh báo.",
  },
  {
    id: "6",
    code: "FLASH100K_091",
    campaignTitle: "Flash Sale giới hạn",
    originalAmount: 1200000,
    discountAmount: 0,
    status: "BLOCKED",
    blockedReason: "Thiết bị giả lập",
    hoursAgo: 100,
    ruleType: "FIXED_AMOUNT",
    minBasket: 1000000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882600_06",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "Trình giả lập Android",
    trustScore: 18,
    auditNote: "Phát hiện môi trường giả lập khi áp mã.",
  },
  {
    id: "7",
    code: "TECH50K",
    campaignTitle: "Ngành hàng Công nghệ",
    originalAmount: 500000,
    discountAmount: 50000,
    status: "SUCCESS",
    hoursAgo: 124,
    ruleType: "FIXED_AMOUNT",
    minBasket: 500000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882550_07",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 95,
    auditNote: "Không phát hiện dấu hiệu bất thường.",
  },
  {
    id: "8",
    code: "SUMMER_WELCOME",
    campaignTitle: "Khuyến mãi Mùa hè rực rỡ",
    originalAmount: 3200000,
    discountAmount: 400000,
    status: "SUCCESS",
    hoursAgo: 320,
    ruleType: "FIXED_AMOUNT",
    minBasket: 3000000,
    channel: "Storefront",
    transactionRef: "LOG_REDEMPTION_882400_08",
    ip: "113.161.45.19",
    isp: "FPT Telecom, TP.HCM",
    device: "macOS • Chrome 129.0",
    trustScore: 94,
    auditNote: "Không phát hiện dấu hiệu bất thường.",
  },
];

export async function listStoreHistory(): Promise<RedemptionRecord[]> {
  await wait(400);
  const now = Date.now();
  return SEEDS.map(({ hoursAgo, ...rest }) => ({
    ...rest,
    appliedAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
    expiresAt: new Date(now + 30 * 86_400_000).toISOString(),
  }));
}

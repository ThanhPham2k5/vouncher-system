import type {
  BatchType,
  CampaignStatus,
  CharsetType,
  DurationUnit,
  RewardType,
} from "./types";

type StatusVariant = "success" | "warning" | "muted";

export const STATUS_META: Record<
  CampaignStatus,
  { label: string; variant: StatusVariant }
> = {
  ACTIVE: { label: "ACTIVE", variant: "success" },
  PAUSED: { label: "Tạm dừng", variant: "warning" },
  DRAFT: { label: "Bản nháp", variant: "muted" },
  ENDED: { label: "Đã kết thúc", variant: "muted" },
};

export const BATCH_TYPE_LABEL: Record<BatchType, string> = {
  GENERIC: "Dùng chung 1 mã",
  BULK: "Mã riêng (Bulk)",
};

export const CHARSET_LABEL: Record<CharsetType, string> = {
  ALPHANUMERIC: "Chữ & số (A–Z, 0–9)",
  UPPERCASE: "Chữ hoa (A–Z)",
  NUMERIC: "Chỉ số (0–9)",
};

export const DURATION_LABEL: Record<DurationUnit, string> = {
  DAYS: "Ngày",
  HOURS: "Giờ",
};

export const REWARD_LABEL: Record<RewardType, string> = {
  PERCENT: "Giảm %",
  FIXED: "Giảm cố định",
  GIFT: "Tặng quà",
};

// Hiển thị dạng "01/11/2025, 00:00"
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Giá trị cho input datetime-local: "YYYY-MM-DDTHH:mm"
export function toInputDateTime(value: string): string {
  return value.slice(0, 16);
}

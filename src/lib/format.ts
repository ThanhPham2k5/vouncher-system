const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(value: number): string {
  return vndFormatter.format(value);
}

// Dùng cho trục biểu đồ: 486 Tr, 1.2 Tỷ
export function formatCompactVnd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Tỷ`;
  if (abs >= 1_000_000) return `${Math.round(value / 1_000_000)} Tr`;
  return value.toLocaleString("vi-VN");
}

export function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

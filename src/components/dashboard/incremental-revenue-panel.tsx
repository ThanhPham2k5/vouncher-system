"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCampaignIncrementalRevenue,
  type CampaignRevenueStats,
} from "@/lib/api/statistics";
import { formatRatio } from "@/lib/dashboard/metrics";
import type { CampaignPerformance } from "@/lib/dashboard/types";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Calculator } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Level = "campaign" | "batch" | "code";

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "campaign", label: "Chiến dịch" },
  { value: "batch", label: "Lô" },
  { value: "code", label: "Mã" },
];

// Đối chứng nhập tay được lưu trên trình duyệt này
const STORAGE_KEY = "dashboard:baseline-revenue:v1";

// Chỉ giữ chữ số: "50.000.000" hoặc "50 000 000" đều thành 50000000
function parseAmount(raw: string): number {
  const n = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function readStoredBaselines(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function IncrementalRevenuePanel({
  campaigns,
}: {
  campaigns: CampaignPerformance[];
}) {
  const [campaignId, setCampaignId] = useState("");
  const [level, setLevel] = useState<Level>("campaign");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState<CampaignRevenueStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Đọc đối chứng đã lưu sau khi mount (tránh lỗi khi render phía server)
  useEffect(() => {
    setBaselines(readStoredBaselines());
    setHydrated(true);
  }, []);

  // Ghi lại mỗi khi đối chứng thay đổi
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baselines));
    } catch {
      // Trình duyệt chặn lưu trữ thì bỏ qua, giá trị vẫn dùng được trong phiên hiện tại
    }
  }, [baselines, hydrated]);

  // Chọn chiến dịch đầu tiên khi danh sách có sẵn
  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaigns, campaignId]);

  // Một lần gọi BE lấy đủ chiến dịch, lô và mã (includeCodes=true)
  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    setLoading(true);
    getCampaignIncrementalRevenue(Number(campaignId), { includeCodes: true })
      .then((result) => {
        if (active) setStats(result);
      })
      .catch(() => {
        if (active) {
          toast.error("Không tải được dữ liệu theo lô/mã", {
            description: "Kiểm tra kết nối rồi thử lại.",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  const onCampaignChange = (id: string) => {
    setCampaignId(id);
    setBatchId(null);
    setCode(null);
    setStats(null);
  };

  const onLevelChange = (value: string) => {
    setLevel(value as Level);
    setBatchId(null);
    setCode(null);
  };

  const batches = stats?.batches ?? [];
  const selectedBatch =
    batches.find((b) => b.batchId === batchId) ?? batches[0] ?? null;
  const codes = selectedBatch?.codes ?? [];
  const selectedCode = codes.find((c) => c.code === code) ?? codes[0] ?? null;

  const target = useMemo(() => {
    if (!stats) return null;
    if (level === "campaign") {
      return {
        key: `campaign:${campaignId}`,
        name: stats.campaignName,
        final: stats.campaignSummary.totalFinalAmount,
        discount: stats.campaignSummary.totalDiscountAmount,
      };
    }
    if (level === "batch" && selectedBatch) {
      return {
        key: `batch:${campaignId}:${selectedBatch.batchId}`,
        name: `Lô #${selectedBatch.batchId}`,
        final: selectedBatch.totalFinalAmount,
        discount: selectedBatch.totalDiscountAmount,
      };
    }
    if (level === "code" && selectedBatch && selectedCode) {
      return {
        key: `code:${campaignId}:${selectedBatch.batchId}:${selectedCode.code}`,
        name: selectedCode.code,
        final: selectedCode.totalFinalAmount,
        discount: selectedCode.totalDiscountAmount,
      };
    }
    return null;
  }, [stats, level, campaignId, selectedBatch, selectedCode]);

  const baselineInput = target ? (baselines[target.key] ?? "") : "";
  const baseline = parseAmount(baselineInput);
  const hasBaseline = baseline > 0;
  const incremental = target ? target.final - baseline : 0;
  // Tăng thêm / tiền giảm (%). Chỉ có nghĩa khi đã nhập đối chứng.
  const ratio =
    target && target.discount > 0 && hasBaseline
      ? ((incremental - target.discount) / target.discount) * 100
      : null;

  const setBaselineInput = (value: string) => {
    if (!target) return;
    setBaselines((prev) => ({ ...prev, [target.key]: value }));
  };

  const selectedCampaignName = campaigns.find((c) => c.id === campaignId)?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Doanh thu tăng thêm theo đối chứng
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cấp tính toán</Label>
            <Select value={level} onValueChange={onLevelChange}>
              <SelectTrigger aria-label="Chọn cấp">
                <SelectValue>
                  {LEVEL_OPTIONS.find((o) => o.value === level)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chiến dịch</Label>
            <Select value={campaignId} onValueChange={onCampaignChange}>
              <SelectTrigger aria-label="Chọn chiến dịch">
                <SelectValue placeholder="Chọn chiến dịch">
                  {selectedCampaignName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {level !== "campaign" && (
            <div className="space-y-2">
              <Label>Lô</Label>
              <Select
                value={selectedBatch?.batchId ?? ""}
                onValueChange={(v) => {
                  setBatchId(v);
                  setCode(null);
                }}
                disabled={batches.length === 0}
              >
                <SelectTrigger aria-label="Chọn lô">
                  <SelectValue placeholder="Chưa có lô">
                    {selectedBatch ? `Lô #${selectedBatch.batchId}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.batchId} value={b.batchId}>
                      Lô #{b.batchId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {level === "code" && (
            <div className="space-y-2">
              <Label>Mã</Label>
              <Select
                value={selectedCode?.code ?? ""}
                onValueChange={setCode}
                disabled={codes.length === 0}
              >
                <SelectTrigger aria-label="Chọn mã">
                  <SelectValue placeholder="Chưa có mã">
                    {selectedCode?.code}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {codes.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="baseline-revenue">
              Doanh thu ước tính nếu không có khuyến mãi
            </Label>
            <Input
              id="baseline-revenue"
              inputMode="numeric"
              placeholder="VD: 50000000"
              value={baselineInput}
              onChange={(e) => setBaselineInput(e.target.value)}
              disabled={!target}
            />
          </div>
        </div>

        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:col-span-2",
            loading && "opacity-60 transition-opacity",
          )}
          aria-busy={loading}
        >
          <Metric
            label="Doanh thu có mã"
            value={target ? formatVnd(target.final) : "—"}
          />
          <Metric
            label="Tiền đã giảm"
            value={target ? formatVnd(target.discount) : "—"}
          />
          <Metric
            label="Doanh thu tăng thêm so với đối chứng"
            value={
              target
                ? hasBaseline
                  ? formatVnd(incremental)
                  : "Chưa có đối chứng"
                : "—"
            }
            tone={
              hasBaseline
                ? incremental >= 0
                  ? "positive"
                  : "negative"
                : undefined
            }
          />
          <Metric
            label="Tăng thêm / tiền giảm"
            value={
              ratio === null
                ? "—"
                : `${formatRatio(ratio / 100 + 1)}`.replace(/×$/, "") + "%"
            }
            tone={
              ratio === null ? undefined : ratio >= 0 ? "positive" : "negative"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

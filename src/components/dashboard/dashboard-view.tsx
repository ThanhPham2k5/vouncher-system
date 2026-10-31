"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  Gauge,
  Megaphone,
  Receipt,
  RefreshCw,
  Ticket,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RedemptionDonut } from "@/components/dashboard/redemption-donut";
import { CampaignRanking } from "@/components/dashboard/campaign-ranking";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aggregate, sortCampaigns } from "@/lib/dashboard/metrics";
import { fetchDashboard } from "@/lib/dashboard/service";
import type { DashboardData, DateRange, SortKey } from "@/lib/dashboard/types";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatVnd,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 ngày qua" },
  { value: "month", label: "Tháng này" },
  { value: "all", label: "Toàn thời gian" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "roi_desc", label: "ROI cao nhất" },
  { value: "roi_asc", label: "ROI thấp nhất" },
  { value: "revenue_desc", label: "Doanh thu cao nhất" },
  { value: "cost_desc", label: "Chi phí chiết khấu cao nhất" },
  { value: "redemption_desc", label: "Tỷ lệ đổi mã cao nhất" },
  { value: "newest", label: "Mới nhất gần đây" },
];

const ALL_CAMPAIGNS = "all";

export function DashboardView() {
  const [range, setRange] = useState<DateRange>("7d");
  const [campaignId, setCampaignId] = useState<string>(ALL_CAMPAIGNS);
  const [sortKey, setSortKey] = useState<SortKey>("roi_desc");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);

    fetchDashboard(range)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (!active) return;
        setError("Không tải được dữ liệu thống kê. Vui lòng thử lại.");
        toast.error("Không tải được dữ liệu", {
          description: "Kiểm tra kết nối rồi thử lại.",
        });
      });

    return () => {
      active = false;
    };
  }, [range, attempt]);

  const visible = useMemo(() => {
    if (!data) return [];
    return campaignId === ALL_CAMPAIGNS
      ? data.campaigns
      : data.campaigns.filter((c) => c.id === campaignId);
  }, [data, campaignId]);

  const totals = useMemo(() => aggregate(visible), [visible]);
  const ranked = useMemo(
    () => sortCampaigns(visible, sortKey),
    [visible, sortKey],
  );

  const selectedCampaignName =
    campaignId === ALL_CAMPAIGNS
      ? "Toàn bộ chiến dịch"
      : data?.campaigns.find((c) => c.id === campaignId)?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Bảng điều khiển & Phân tích ROI Khuyến mãi
            </h1>
            <Badge variant="muted">Dữ liệu mẫu</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Theo dõi hiệu quả chiến dịch, tỷ suất sinh lời và chất lượng chuyển
            đổi, chống gian lận.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger aria-label="Chọn chiến dịch" className="sm:w-72">
              <SelectValue placeholder="Toàn bộ chiến dịch">
                {selectedCampaignName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value={ALL_CAMPAIGNS}
                icon={<Megaphone />}
                description="Tổng hợp tất cả mã khuyến mãi"
              >
                Toàn bộ chiến dịch
              </SelectItem>
              {data?.campaigns.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  icon={<Megaphone />}
                  description={`Mã: ${c.batchCode}`}
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className="inline-flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="Khoảng thời gian"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                aria-pressed={range === opt.value}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  range === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Không tải được dữ liệu</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RefreshCw />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Tổng doanh thu tạo ra (Revenue)"
              value={formatVnd(totals.revenue)}
              icon={Wallet}
              hint="Tổng tiền khách thanh toán sau khi áp mã"
            />
            <KpiCard
              title="Chi phí khuyến mãi (Discount)"
              value={formatVnd(totals.cost)}
              icon={Receipt}
              hint="Tổng tiền đã chiết khấu cho khách"
            />
            <KpiCard
              title="Chỉ số tỷ suất ROI"
              value={formatSignedPercent(totals.roi)}
              icon={Gauge}
              highlight="positive"
              hint="(Doanh thu - Chi phí) / Chi phí"
            />
            <KpiCard
              title="Tỷ lệ chuyển đổi (Redemption)"
              value={formatPercent(totals.redemptionRate)}
              icon={Ticket}
              hint={`${formatNumber(totals.redeemed)} / ${formatNumber(totals.issued)} mã đã dùng`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Tương quan doanh thu, chi phí và ROI
                </CardTitle>
                <CardDescription>
                  Doanh thu và chi phí theo thời gian, ROI hiển thị trên trục
                  bên phải.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={data.daily} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Trạng thái áp mã & gian lận
                </CardTitle>
                <CardDescription>
                  Phân bổ các lượt yêu cầu xác thực mã
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RedemptionDonut fraud={data.fraud} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Xếp hạng hiệu năng chiến dịch theo ROI
                </CardTitle>
                <CardDescription>
                  So sánh chi phí chiết khấu với doanh thu thực thu của từng
                  chiến dịch
                </CardDescription>
              </div>
              <Select
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
              >
                <SelectTrigger aria-label="Sắp xếp" className="sm:w-64">
                  <span className="flex min-w-0 items-center gap-2">
                    <ArrowDownUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue className="truncate" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <CampaignRanking campaigns={ranked} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

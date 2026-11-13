"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { CampaignRanking } from "@/components/dashboard/campaign-ranking";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { IncrementalRevenuePanel } from "@/components/dashboard/incremental-revenue-panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RedemptionDonut } from "@/components/dashboard/redemption-donut";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { fetchDashboard, refreshDashboardLive } from "@/lib/dashboard/service";
import type { DashboardData, DateRange, SortKey } from "@/lib/dashboard/types";
import { useDashboardStream } from "@/lib/dashboard/use-dashboard-stream";
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
  { value: "all", label: "12 tháng qua" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "roi_desc", label: "ROI cận trên cao nhất" },
  { value: "roi_asc", label: "ROI cận trên thấp nhất" },
  { value: "revenue_desc", label: "Doanh thu có mã cao nhất" },
  { value: "cost_desc", label: "Tiền đã giảm cao nhất" },
  { value: "redemption_desc", label: "Tỷ lệ dùng trên quota cao nhất" },
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
  const [liveTick, setLiveTick] = useState(0);

  // Dữ liệu mới nhất để làm mới nhanh không cần đưa vào dependency
  const dataRef = useRef<DashboardData | null>(null);
  // Sau khi SSE nối lại thì tải đầy đủ thay vì làm mới nhanh
  const needsFullRefresh = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useDashboardStream({
    onEvent: (event) => {
      if (event.type === "REDEMPTION_SUCCESS") {
        toast.success("Có lượt áp mã mới", {
          description: `${event.code ?? ""} • -${new Intl.NumberFormat("vi-VN").format(event.discountAmount ?? 0)} ₫`,
        });
      } else if (event.type === "CLAIMED") {
        // Nhận mã không làm đổi số liệu, chỉ thông báo
        toast.info("Có khách vừa nhận mã", {
          description: event.code ?? undefined,
        });
        return;
      }
      // Lượt thất bại làm đổi tỷ lệ chuyển đổi, làm mới overview và biểu đồ
      setLiveTick((t) => t + 1);
    },
    onReconnect: () => {
      needsFullRefresh.current = true;
      setLiveTick((t) => t + 1);
    },
  });

  // Gom các sự kiện liên tiếp trong 1,5 giây. Không xóa dữ liệu đang hiển thị.
  useEffect(() => {
    if (liveTick === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      const current = dataRef.current;
      const full = needsFullRefresh.current || !current;
      needsFullRefresh.current = false;
      const request = full
        ? fetchDashboard(range)
        : refreshDashboardLive(range, current);
      request
        .then((result) => {
          if (active) setData(result);
        })
        .catch(() => {});
    }, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [liveTick, range]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Bảng điều khiển hiệu quả khuyến mãi
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger
              aria-label="Chọn chiến dịch"
              className="whitespace-nowrap sm:w-72"
            >
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
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
              title="Doanh thu từ đơn có áp dụng mã"
              value={formatVnd(totals.revenue)}
              icon={Wallet}
            />
            <KpiCard
              title="Tổng tiền đã giảm"
              value={formatVnd(totals.cost)}
              icon={Receipt}
            />
            <KpiCard
              title="ROI (cận trên)"
              value={formatSignedPercent(totals.roi)}
              icon={Gauge}
              highlight="positive"
            />
            <KpiCard
              title="Tỷ lệ dùng trên quota"
              value={`${formatPercent(totals.redemptionRate)} - ${formatNumber(totals.redeemed)} / ${formatNumber(totals.issued)} lượt dùng trên tổng quota`}
              icon={Ticket}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Doanh thu và tiền giảm theo thời gian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={data.daily} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trạng thái áp mã</CardTitle>
              </CardHeader>
              <CardContent>
                <RedemptionDonut status={data.fraud} />
              </CardContent>
            </Card>
          </div>

          <IncrementalRevenuePanel campaigns={data.campaigns} />

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Xếp hạng chiến dịch</CardTitle>
              </div>
              <Select
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
              >
                <SelectTrigger
                  aria-label="Sắp xếp"
                  className="whitespace-nowrap sm:w-80"
                >
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

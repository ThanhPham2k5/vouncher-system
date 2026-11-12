"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  Ticket,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RedemptionDetailDialog } from "@/components/store/redemption-detail-dialog";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { listStoreHistory, type RedemptionRecord } from "@/lib/store-history";
import { toast } from "sonner";

const ALL = "ALL";
const PAGE_SIZE = 5;

const STATUS_OPTIONS = [
  { value: ALL, label: "Tất cả trạng thái" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "BLOCKED", label: "Thất bại" },
];

const PERIOD_OPTIONS = [
  { value: ALL, label: "Tất cả thời gian" },
  { value: "7", label: "7 ngày gần đây" },
  { value: "30", label: "30 ngày gần đây" },
];

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

export function HistoryView({ customerId }: { customerId: string | null }) {
  const [records, setRecords] = useState<RedemptionRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [period, setPeriod] = useState(ALL);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<RedemptionRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRecords(await listStoreHistory(customerId));
    } catch (err) {
      setRecords([]);
      toast.error("Không tải được lịch sử áp mã", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [customerId]);

  // Thống kê tính trên toàn bộ lịch sử, không theo bộ lọc
  const stats = useMemo(() => {
    const all = records ?? [];
    const success = all.filter((r) => r.status === "SUCCESS");
    const blocked = all.length - success.length;
    return {
      total: all.length,
      success: success.length,
      successRate: all.length
        ? Math.round((success.length / all.length) * 100)
        : 0,
      blocked,
      blockedRate: all.length ? Math.round((blocked / all.length) * 100) : 0,
      saved: success.reduce((sum, r) => sum + r.discountAmount, 0),
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const days = period === ALL ? null : Number(period);
    const cutoff = days === null ? null : Date.now() - days * 86_400_000;
    return (records ?? []).filter(
      (r) =>
        (status === ALL || r.status === status) &&
        (cutoff === null || Date.parse(r.appliedAt) >= cutoff) &&
        matchesSearch(q, r.code, r.campaignTitle, r.transactionRef),
    );
  }, [records, query, status, period]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Lịch sử áp mã khuyến mãi
        </h1>
        <p className="text-sm text-muted-foreground">
          Danh sách các lần kích hoạt và áp dụng mã voucher của tài khoản của
          bạn. Dữ liệu được bảo vệ và đồng bộ theo thời gian thực.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Ticket}
          label="Tổng lượt áp mã"
          value={String(stats.total)}
          unit="lượt"
          hint="Giao dịch qua PromoCloud"
        />
        <StatCard
          icon={CheckCircle2}
          label="Thành công"
          value={String(stats.success)}
          unit={`lượt (${stats.successRate}%)`}
          hint="Tỷ lệ áp hợp lệ"
          tone="success"
        />
        <StatCard
          icon={ShieldAlert}
          label="Thất bại"
          value={String(stats.blocked)}
          unit={`lượt (${stats.blockedRate}%)`}
          hint="Không áp được mã"
          tone="destructive"
        />
        <StatCard
          icon={Wallet}
          label="Tổng tiền đã tiết kiệm"
          value={formatVnd(stats.saved)}
          hint="Giá trị tích lũy"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã voucher (ví dụ: FLASHSALE20)"
              className="pl-9"
              aria-label="Tìm theo mã voucher"
            />
          </div>
          <div className="lg:w-56">
            <SearchableSelect
              aria-label="Lọc theo trạng thái"
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              searchPlaceholder="Tìm trạng thái..."
            />
          </div>
          <div className="lg:w-56">
            <SearchableSelect
              aria-label="Lọc theo thời gian"
              value={period}
              onValueChange={(v) => {
                setPeriod(v);
                setPage(1);
              }}
              options={PERIOD_OPTIONS}
              searchPlaceholder="Tìm khoảng thời gian..."
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Làm mới dữ liệu
          </Button>
        </CardContent>
      </Card>

      {records === null ? (
        <Skeleton className="h-72 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Không có lượt áp mã nào khớp bộ lọc.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã voucher</TableHead>
                  <TableHead>Tiền giảm và đơn hàng</TableHead>
                  <TableHead>Tình trạng xác thực</TableHead>
                  <TableHead>Thời điểm áp dụng</TableHead>
                  <TableHead className="text-right">Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setDetail(r)}
                  >
                    <TableCell>
                      <p className="font-mono text-sm font-semibold">
                        {r.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.campaignTitle}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p
                        className={
                          r.status === "SUCCESS"
                            ? "font-semibold text-primary"
                            : "font-semibold text-muted-foreground"
                        }
                      >
                        {r.status === "SUCCESS"
                          ? `-${formatVnd(r.discountAmount)}`
                          : "0 ₫"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Đơn gốc: {formatVnd(r.originalAmount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {r.status === "SUCCESS" ? (
                        <Badge variant="success">Thành công</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="destructive">Thất bại</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.appliedAt).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Xem chi tiết ${r.code}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            total={filtered.length}
            page={safePage}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </Card>
      )}

      <RedemptionDetailDialog
        record={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone?: "success" | "destructive";
}) {
  const valueClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-primary";
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-bold ${valueClass}`}>
          {value}
          {unit && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

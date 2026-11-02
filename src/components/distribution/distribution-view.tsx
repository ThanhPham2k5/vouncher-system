"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { SendDistributionDialog } from "@/components/distribution/send-distribution-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDistributionLogs } from "@/lib/api/distribution";
import { listVouchers } from "@/lib/api/vouchers";
import {
  DISTRIBUTION_STATUSES,
  type DistributionLogResponse,
  type DistributionStatus,
  type VoucherResponse,
} from "@/lib/campaigns/be-types";
import { DISTRIBUTION_LABEL, formatDateTime } from "@/lib/campaigns/format";
import { listCampaigns } from "@/lib/campaigns/service";
import type { CampaignView } from "@/lib/campaigns/types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";

const PAGE_SIZE = 10;
const ALL = "ALL";

const STATUS_META: Record<
  DistributionStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "Đang chờ", variant: "warning" },
  SENT: { label: "Đã gửi", variant: "success" },
  FAILED: { label: "Thất bại", variant: "destructive" },
};

interface LoadedData {
  logs: DistributionLogResponse[];
  vouchers: VoucherResponse[];
  campaigns: CampaignView[];
}

export function DistributionView() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [campaignFilter, setCampaignFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendSeq, setSendSeq] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([listDistributionLogs(), listVouchers(), listCampaigns()])
      .then(([logs, vouchers, campaigns]) => {
        if (active) setData({ logs, vouchers, campaigns });
      })
      .catch(() => {
        if (active) setError("Không tải được nhật ký phân phối.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  // Voucher và chiến dịch suy ra từ voucher, vì BE không trả campaignId trong log
  const voucherById = useMemo(() => {
    const map = new Map<number, VoucherResponse>();
    data?.vouchers.forEach((v) => map.set(v.id, v));
    return map;
  }, [data]);

  const campaignName = useMemo(() => {
    const map = new Map<number, string>();
    data?.campaigns.forEach((c) => map.set(c.id, c.name));
    return (id: number | undefined) =>
      id === undefined ? "—" : (map.get(id) ?? `Chiến dịch #${id}`);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.logs.filter((l) => {
      const voucher = voucherById.get(l.voucherId);
      const matchStatus = statusFilter === ALL || l.status === statusFilter;
      const matchCampaign =
        campaignFilter === ALL ||
        String(voucher?.campaignId) === campaignFilter;
      const matchText =
        !q ||
        l.targetAddress.toLowerCase().includes(q) ||
        (voucher?.code.toLowerCase().includes(q) ?? false);
      return matchStatus && matchCampaign && matchText;
    });
  }, [data, voucherById, search, statusFilter, campaignFilter]);

  const counts = useMemo(() => {
    const result: Record<DistributionStatus, number> = {
      PENDING: 0,
      SENT: 0,
      FAILED: 0,
    };
    data?.logs.forEach((l) => {
      result[l.status] += 1;
    });
    return result;
  }, [data]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Kênh phân phối</h1>
          <p className="text-sm text-muted-foreground">
            Nhật ký gửi mã qua email và webhook cho khách hàng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAttempt((n) => n + 1)}
            disabled={!data}
          >
            <RefreshCw />
            Làm mới
          </Button>
          <Button
            onClick={() => {
              setSendSeq((n) => n + 1);
              setSendOpen(true);
            }}
            disabled={!data}
          >
            <Plus />
            Gửi mã
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo địa chỉ nhận hoặc mã voucher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm nhật ký"
            />
          </div>
          <div className="lg:w-56">
            <SearchableSelect
              aria-label="Lọc theo chiến dịch"
              value={campaignFilter}
              onValueChange={(v) => {
                setCampaignFilter(v);
                setPage(1);
              }}
              searchPlaceholder="Tìm chiến dịch..."
              options={[
                { value: ALL, label: "Tất cả chiến dịch" },
                ...(data?.campaigns ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
            />
          </div>
          <div className="lg:w-56">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  Tất cả trạng thái ({data?.logs.length ?? 0})
                </SelectItem>
                {DISTRIBUTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label} ({counts[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {pageItems.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Chưa có nhật ký nào khớp bộ lọc.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Mã voucher</TableHead>
                    <TableHead>Chiến dịch</TableHead>
                    <TableHead>Kênh</TableHead>
                    <TableHead>Địa chỉ nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((l) => {
                    const voucher = voucherById.get(l.voucherId);
                    const status = STATUS_META[l.status];
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs tabular-nums">
                          #{l.id}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold">
                          {voucher?.code ?? `#${l.voucherId}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {campaignName(voucher?.campaignId)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {DISTRIBUTION_LABEL[l.channel]}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {l.targetAddress}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(l.sentAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationBar
            total={filtered.length}
            page={safePage}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </Card>
      )}

      <SendDistributionDialog
        key={sendSeq}
        open={sendOpen}
        campaigns={data?.campaigns ?? []}
        onOpenChange={setSendOpen}
        onSent={(log) =>
          setData((prev) =>
            prev ? { ...prev, logs: [...prev.logs, log] } : prev,
          )
        }
      />
    </div>
  );
}

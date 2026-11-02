"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { VoucherDetailDialog } from "@/components/vouchers/voucher-detail-dialog";
import {
  WALLET_STATUS_META,
  WALLET_STATUS_ORDER,
} from "@/components/vouchers/voucher-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  getVoucherByCode,
  listCustomerVouchers,
  listVouchers,
} from "@/lib/api/vouchers";
import type {
  CustomerVoucherResponse,
  CustomerVoucherStatus,
  VoucherBatchResponse,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { listCampaigns, listVoucherBatches } from "@/lib/campaigns/service";
import type { CampaignView } from "@/lib/campaigns/types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";

const PAGE_SIZE = 10;
const ALL = "ALL";

interface LoadedData {
  vouchers: VoucherResponse[];
  campaigns: CampaignView[];
  batches: VoucherBatchResponse[];
  wallet: CustomerVoucherResponse[];
}

export function VouchersView() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>(ALL);
  const [batchFilter, setBatchFilter] = useState<string>(ALL);
  const [lookupCode, setLookupCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [detail, setDetail] = useState<VoucherResponse | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      listVouchers(),
      listCampaigns(),
      listVoucherBatches(),
      listCustomerVouchers(),
    ])
      .then(([vouchers, campaigns, batches, wallet]) => {
        if (active) setData({ vouchers, campaigns, batches, wallet });
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách mã giảm giá.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const campaignName = useMemo(() => {
    const map = new Map<number, string>();
    data?.campaigns.forEach((c) => map.set(c.id, c.name));
    return (id: number) => map.get(id) ?? `Chiến dịch #${id}`;
  }, [data]);

  const batchById = useMemo(() => {
    const map = new Map<number, VoucherBatchResponse>();
    data?.batches.forEach((b) => map.set(b.id, b));
    return map;
  }, [data]);

  // Đếm trạng thái ví theo từng voucher
  const walletCounts = useMemo(() => {
    const map = new Map<number, Record<CustomerVoucherStatus, number>>();
    data?.wallet.forEach((w) => {
      const row = map.get(w.voucherId) ?? {
        AVAILABLE: 0,
        UNAVAILABLE: 0,
        USED: 0,
        EXPIRED: 0,
      };
      row[w.status] += 1;
      map.set(w.voucherId, row);
    });
    return map;
  }, [data]);

  const batchOptions = useMemo(
    () =>
      (data?.batches ?? []).filter(
        (b) =>
          campaignFilter === ALL || String(b.campaignId) === campaignFilter,
      ),
    [data, campaignFilter],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.vouchers.filter((v) => {
      const matchCampaign =
        campaignFilter === ALL || String(v.campaignId) === campaignFilter;
      const matchBatch =
        batchFilter === ALL || String(v.batchId) === batchFilter;
      const matchText = !q || v.code.toLowerCase().includes(q);
      return matchCampaign && matchBatch && matchText;
    });
  }, [data, search, campaignFilter, batchFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  async function handleLookup() {
    const code = lookupCode.trim();
    if (!code) return;
    setLooking(true);
    try {
      const found = await getVoucherByCode(code);
      setDetail(found);
    } catch (err) {
      toast.error("Không tìm thấy mã", {
        description:
          err instanceof Error ? err.message : "Kiểm tra lại mã giảm giá.",
      });
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mã giảm giá</h1>
        <p className="text-sm text-muted-foreground">
          Danh sách mã đã sinh từ các lô, kèm số lượng đang nằm trong ví khách
          hàng.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLookup();
            }}
          >
            <Input
              placeholder="Tra cứu chính xác theo mã (VD: SUMMER2026)"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              aria-label="Tra cứu theo mã"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={looking || !lookupCode.trim()}
            >
              <Search />
              Tra cứu
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Lọc theo mã trong danh sách..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Lọc mã"
            />
          </div>
          <div className="lg:w-56">
            <SearchableSelect
              aria-label="Lọc theo chiến dịch"
              value={campaignFilter}
              onValueChange={(v) => {
                setCampaignFilter(v);
                setBatchFilter(ALL);
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
          <div className="lg:w-48">
            <SearchableSelect
              aria-label="Lọc theo lô"
              value={batchFilter}
              onValueChange={(v) => {
                setBatchFilter(v);
                setPage(1);
              }}
              searchPlaceholder="Tìm lô..."
              options={[
                { value: ALL, label: "Tất cả lô" },
                ...batchOptions.map((b) => ({
                  value: String(b.id),
                  label: `Lô #${b.id}`,
                })),
              ]}
            />
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
              Không có mã nào khớp bộ lọc.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Chiến dịch</TableHead>
                    <TableHead>Lô</TableHead>
                    <TableHead>Trong ví khách</TableHead>
                    <TableHead className="w-24 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((v) => {
                    const counts = walletCounts.get(v.id);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm font-semibold">
                          {v.code}
                        </TableCell>
                        <TableCell className="text-sm">
                          {campaignName(v.campaignId)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          #{v.batchId}
                        </TableCell>
                        <TableCell>
                          {counts ? (
                            <div className="flex flex-wrap gap-1">
                              {WALLET_STATUS_ORDER.filter(
                                (s) => counts[s] > 0,
                              ).map((s) => (
                                <Badge
                                  key={s}
                                  variant={WALLET_STATUS_META[s].variant}
                                >
                                  {WALLET_STATUS_META[s].label} {counts[s]}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Chưa ai nhận
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetail(v)}
                            aria-label={`Xem ${v.code}`}
                          >
                            Chi tiết
                          </Button>
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

      <VoucherDetailDialog
        key={detail?.id ?? "none"}
        voucher={detail}
        campaignName={detail ? campaignName(detail.campaignId) : ""}
        batch={detail ? batchById.get(detail.batchId) : undefined}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
    </div>
  );
}

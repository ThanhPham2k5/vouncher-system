"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { VoucherDetailDialog } from "@/components/vouchers/voucher-detail-dialog";
import { getVoucherByCode, listVouchers } from "@/lib/api/vouchers";
import type { VoucherResponse } from "@/lib/campaigns/be-types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { Eye, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const ALL = "ALL";

export function VouchersView() {
  const [vouchers, setVouchers] = useState<VoucherResponse[] | null>(null);
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
    listVouchers()
      .then((data) => {
        if (active) setVouchers(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách mã giảm giá.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  // BE đã trả đầy đủ campaign và batch trong từng voucher nên suy ra bộ lọc từ đây
  const campaignOptions = useMemo(() => {
    const map = new Map<number, string>();
    vouchers?.forEach((v) => map.set(v.campaign.id, v.campaign.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [vouchers]);

  const batchOptions = useMemo(() => {
    const map = new Map<number, VoucherResponse["batch"]>();
    vouchers?.forEach((v) => {
      if (campaignFilter === ALL || String(v.campaign.id) === campaignFilter) {
        map.set(v.batch.id, v.batch);
      }
    });
    return Array.from(map.values());
  }, [vouchers, campaignFilter]);

  const filtered = useMemo(() => {
    if (!vouchers) return [];
    const q = normalizeSearch(search);
    return vouchers.filter((v) => {
      const matchCampaign =
        campaignFilter === ALL || String(v.campaign.id) === campaignFilter;
      const matchBatch =
        batchFilter === ALL || String(v.batch.id) === batchFilter;
      const matchText = matchesSearch(q, v.code);
      return matchCampaign && matchBatch && matchText;
    });
  }, [vouchers, search, campaignFilter, batchFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  // Tra cứu theo mã: mở dialog hiển thị ví khách hàng đang giữ mã
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
          Danh sách mã đã sinh từ các lô. Tra cứu theo mã để xem khách hàng nào
          đang giữ mã đó.
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
                ...campaignOptions.map((c) => ({
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
      ) : !vouchers ? (
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
                    <TableHead className="w-24 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {v.code}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.campaign.name}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        #{v.batch.id}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(v)}
                          aria-label={`Xem ${v.code}`}
                        >
                          <Eye />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
    </div>
  );
}

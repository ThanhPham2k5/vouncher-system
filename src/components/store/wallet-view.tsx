"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Copy, Gift, Percent, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { useSavedCodes } from "@/lib/store-wallet";
import {
  listStoreVouchers,
  VOUCHER_KIND_LABEL,
  type StoreVoucher,
  type VoucherKind,
} from "@/lib/store-vouchers";

const ALL = "ALL";
const PAGE_SIZE = 6; // 3 cột x 2 hàng
const FILTERS: { value: typeof ALL | VoucherKind; label: string }[] = [
  { value: ALL, label: "Tất cả" },
  { value: "FIXED", label: VOUCHER_KIND_LABEL.FIXED },
  { value: "PERCENT", label: VOUCHER_KIND_LABEL.PERCENT },
  { value: "GIFT", label: VOUCHER_KIND_LABEL.GIFT },
];

const KIND_ICON: Record<VoucherKind, typeof Percent> = {
  PERCENT: Percent,
  FIXED: Banknote,
  GIFT: Gift,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

async function copyCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Đã sao chép mã", { description: code });
  } catch {
    toast.error("Không sao chép được mã", { description: code });
  }
}

export function WalletView() {
  const [vouchers, setVouchers] = useState<StoreVoucher[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof ALL | VoucherKind>(ALL);
  const [page, setPage] = useState(1);
  const saved = useSavedCodes();

  useEffect(() => {
    let active = true;
    listStoreVouchers().then((data) => {
      if (active) setVouchers(data);
    });
    return () => {
      active = false;
    };
  }, []);

  // Chỉ hiện voucher đã lưu, giữ thứ tự lưu
  const owned = useMemo(() => {
    const all = vouchers ?? [];
    return saved
      .map((code) => all.find((v) => v.code === code))
      .filter((v): v is StoreVoucher => v !== undefined);
  }, [vouchers, saved]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return owned.filter(
      (v) =>
        (filter === ALL || v.kind === filter) &&
        matchesSearch(q, v.code, v.title, v.subtitle, v.headline, v.condition),
    );
  }, [owned, query, filter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Kho mã của bạn</h1>
        <p className="text-sm text-muted-foreground">
          Lưu voucher để áp dụng ngay tại bước thanh toán giỏ hàng hoặc chia sẻ
          ưu đãi cùng bạn bè
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã hoặc nội dung ưu đãi..."
              className="pl-9"
              aria-label="Tìm trong kho mã"
            />
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Loại ưu đãi"
          >
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilter(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {vouchers === null ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : owned.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="font-medium">Kho mã đang trống</p>
            <p className="text-sm text-muted-foreground">
              Bạn chưa lưu mã nào. Vào trang Săn mã để lưu voucher.
            </p>
            <Button asChild variant="outline">
              <Link href="/store/vouchers">Đi tới Săn mã</Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không có mã nào khớp bộ lọc.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((voucher) => {
              const Icon = KIND_ICON[voucher.kind];
              return (
                <Card key={voucher.code} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold leading-tight">
                            {voucher.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {voucher.subtitle}
                          </p>
                        </div>
                      </div>
                      {voucher.badge && (
                        <Badge variant="muted">{voucher.badge}</Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xl font-bold text-primary">
                        {voucher.headline}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {voucher.detail}
                      </p>
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {voucher.condition}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                      <span className="font-mono text-xs font-semibold">
                        #{voucher.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        HSD: {formatDate(voucher.expiresAt)}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => copyCode(voucher.code)}
                    >
                      <Copy className="h-4 w-4" />
                      Dùng ngay
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
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
    </div>
  );
}

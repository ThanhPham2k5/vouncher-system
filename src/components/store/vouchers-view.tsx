"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/campaigns/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
  CLAIM_KIND_LABEL,
  listClaimableVouchers,
  type ClaimableVoucher,
  type ClaimKind,
} from "@/lib/store-claimable-vouchers";
import { Banknote, Gift, Layers, Percent, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const ALL = "ALL";
const PAGE_SIZE = 6; // 3 cột x 2 hàng
const FILTERS: { value: typeof ALL | ClaimKind; label: string }[] = [
  { value: ALL, label: "Tất cả" },
  { value: "FIXED", label: CLAIM_KIND_LABEL.FIXED },
  { value: "PERCENT", label: CLAIM_KIND_LABEL.PERCENT },
  { value: "GIFT", label: CLAIM_KIND_LABEL.GIFT },
  { value: "TIERED", label: CLAIM_KIND_LABEL.TIERED },
];

const KIND_ICON: Record<ClaimKind, typeof Percent> = {
  PERCENT: Percent,
  FIXED: Banknote,
  GIFT: Gift,
  TIERED: Layers,
};

interface VouchersViewProps {
  customerId: string | null;
}

export function VouchersView({ customerId }: VouchersViewProps) {
  const [vouchers, setVouchers] = useState<ClaimableVoucher[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof ALL | ClaimKind>(ALL);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    listClaimableVouchers()
      .then((list) => {
        if (active) setVouchers(list);
      })
      .catch(() => {
        if (active) {
          setVouchers([]);
          toast.error("Không tải được danh sách mã khuyến mãi");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return (vouchers ?? []).filter(
      (v) =>
        (filter === ALL || v.kind === filter) &&
        matchesSearch(
          q,
          v.code,
          v.title,
          v.subtitle,
          v.headline,
          v.conditions.join(" "),
        ),
    );
  }, [vouchers, query, filter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mã khuyến mãi</h1>
        <p className="text-sm text-muted-foreground">
          Mã hiển thị ở đây có thể áp dụng trực tiếp tại bước thanh toán giỏ
          hàng.
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
              aria-label="Tìm mã khuyến mãi"
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
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không tìm thấy mã phù hợp.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((voucher) => {
              const Icon = KIND_ICON[voucher.kind];
              return (
                <Card key={voucher.code} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
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

                    <div className="space-y-1">
                      <p className="text-xl font-bold text-primary">
                        {voucher.headline}
                      </p>
                    </div>

                    <div className="space-y-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Điều kiện</p>
                      {voucher.conditions.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                      <span className="font-mono text-xs font-semibold">
                        #{voucher.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hết hạn {formatDateTime(voucher.expiresAt)}
                      </span>
                    </div>
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

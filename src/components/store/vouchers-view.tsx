"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCustomerVoucher,
  listCustomerVouchers,
} from "@/lib/api/vouchers";
import type { CustomerVoucherResponse } from "@/lib/campaigns/be-types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
  CLAIM_KIND_LABEL,
  listClaimableVouchers,
  type ClaimableVoucher,
  type ClaimKind,
} from "@/lib/store-claimable-vouchers";
import {
  Banknote,
  Check,
  Gift,
  Layers,
  Percent,
  Plus,
  Search,
} from "lucide-react";
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
  const [wallet, setWallet] = useState<CustomerVoucherResponse[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof ALL | ClaimKind>(ALL);
  const [page, setPage] = useState(1);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listClaimableVouchers(),
      customerId
        ? listCustomerVouchers({ customerId })
        : Promise.resolve<CustomerVoucherResponse[]>([]),
    ])
      .then(([list, owned]) => {
        if (!active) return;
        setVouchers(list);
        setWallet(owned);
      })
      .catch(() => {
        if (!active) return;
        setVouchers([]);
        setWallet([]);
        toast.error("Không tải được danh sách mã khuyến mãi");
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  // Mã đã nằm trong ví của khách (lấy từ BE)
  const savedCodes = useMemo(
    () => new Set((wallet ?? []).map((w) => w.voucherCode)),
    [wallet],
  );

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

  async function handleSave(voucher: ClaimableVoucher) {
    if (!customerId) {
      toast.error("Vui lòng đăng nhập để lưu mã");
      return;
    }
    setSavingCode(voucher.code);
    try {
      const created = await createCustomerVoucher({
        customerId,
        voucherId: voucher.voucherId,
      });
      setWallet((prev) => [...(prev ?? []), created]);
      toast.success("Đã lưu mã vào ví", { description: voucher.code });
    } catch (err) {
      toast.error("Không lưu được mã", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mã khuyến mãi</h1>
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
              const isSaved = savedCodes.has(voucher.code);
              const isSaving = savingCode === voucher.code;
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

                    <div className="mt-auto border-t pt-3">
                      <span className="font-mono text-xs font-semibold">
                        #{voucher.code}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      variant={isSaved ? "outline" : "default"}
                      disabled={isSaved || isSaving}
                      onClick={() => handleSave(voucher)}
                    >
                      {isSaved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Đã lưu
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          {isSaving ? "Đang lưu..." : "Lưu"}
                        </>
                      )}
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

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { WALLET_STATUS_META } from "@/components/vouchers/voucher-status";
import {
  createCustomerVoucher,
  deleteCustomerVoucher,
  getVoucherByCode,
  listCustomerVouchers,
  listVouchers,
} from "@/lib/api/vouchers";
import type { CustomerVoucherResponse } from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { listCampaigns } from "@/lib/campaigns/service";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
  CLAIM_KIND_LABEL,
  describeVouchers,
  type ClaimableVoucher,
  type ClaimKind,
} from "@/lib/store-claimable-vouchers";
import {
  Banknote,
  Copy,
  Gift,
  Layers,
  Percent,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

async function copyCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Đã sao chép mã", { description: code });
  } catch {
    toast.error("Không sao chép được mã", { description: code });
  }
}

interface WalletViewProps {
  customerId: string | null;
}

export function WalletView({ customerId }: WalletViewProps) {
  const [wallet, setWallet] = useState<CustomerVoucherResponse[] | null>(null);
  const [catalog, setCatalog] = useState<ClaimableVoucher[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof ALL | ClaimKind>(ALL);
  const [page, setPage] = useState(1);
  const [importCode, setImportCode] = useState("");
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const owned = customerId
        ? await listCustomerVouchers({ customerId })
        : [];
      // Chỉ tải thông tin cho các voucher có trong ví
      const ids = new Set(owned.map((w) => w.voucherId));
      const infos =
        ids.size > 0
          ? await describeVouchers(
              (await listVouchers()).filter((v) => ids.has(v.id)),
            )
          : [];
      if (!active) return;
      setWallet(owned);
      setCatalog(infos);
    })().catch(() => {
      if (!active) return;
      setWallet([]);
      toast.error("Không tải được kho mã");
    });
    return () => {
      active = false;
    };
  }, [customerId]);

  // Ghép thông tin ưu đãi theo mã. Mã không có trong danh sách săn mã vẫn hiển thị với thông tin tối thiểu.
  const items = useMemo(() => {
    const infoByCode = new Map(catalog.map((c) => [c.code, c]));
    return (wallet ?? []).map((w) => ({
      wallet: w,
      info: infoByCode.get(w.voucherCode),
    }));
  }, [wallet, catalog]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return items.filter(
      ({ wallet: w, info }) =>
        (filter === ALL || info?.kind === filter) &&
        matchesSearch(
          q,
          w.voucherCode,
          info?.title ?? "",
          info?.subtitle ?? "",
          info?.headline ?? "",
          (info?.conditions ?? []).join(" "),
        ),
    );
  }, [items, query, filter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  // Import: tra mã để lấy id voucher, rồi POST /vouchers/customer với customerId và voucherId
  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = importCode.trim();
    if (!code) return;
    if (!customerId) {
      toast.error("Vui lòng đăng nhập để thêm mã");
      return;
    }
    if ((wallet ?? []).some((w) => w.voucherCode === code)) {
      toast.info("Mã này đã có trong kho", { description: code });
      return;
    }
    setImporting(true);
    try {
      const voucher = await getVoucherByCode(code);
      const campaigns = await listCampaigns();
      const campaign = campaigns.find((c) => c.id === voucher.campaignId);
      if (campaign?.status !== "ACTIVE") {
        toast.error("Không thể import mã", {
          description: "Mã thuộc chiến dịch không còn hoạt động",
        });
        return;
      }
      const created = await createCustomerVoucher({
        customerId,
        voucherId: voucher.id,
      });
      setWallet((prev) => [...(prev ?? []), created]);
      const [info] = await describeVouchers([voucher]);
      if (info) setCatalog((prev) => [...prev, info]);
      setImportCode("");
      toast.success("Đã thêm mã vào kho", { description: code });
    } catch (err) {
      toast.error("Không thêm được mã", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(entry: CustomerVoucherResponse) {
    setDeletingId(entry.id);
    try {
      await deleteCustomerVoucher(entry.id);
      setWallet((prev) => (prev ?? []).filter((w) => w.id !== entry.id));
      toast.success("Đã xóa mã khỏi kho", { description: entry.voucherCode });
    } catch (err) {
      toast.error("Không xóa được mã", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Kho mã của bạn</h1>
        <p className="text-sm text-muted-foreground">
          Mã trong kho áp dụng ngay tại bước thanh toán giỏ hàng hoặc chia sẻ ưu
          đãi cùng bạn bè
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={handleImport}
          >
            <Input
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="Nhập mã để thêm vào kho (VD: SUMMER2026)"
              aria-label="Mã cần import"
              className="font-mono"
            />
            <Button type="submit" disabled={importing || !importCode.trim()}>
              <Plus />
              {importing ? "Đang thêm..." : "Import mã"}
            </Button>
          </form>
        </CardContent>
      </Card>

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

      {wallet === null ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="font-medium">Kho mã đang trống</p>
            <p className="text-sm text-muted-foreground">
              Bạn chưa có mã nào. Nhập mã ở trên hoặc vào trang Săn mã để lưu
              voucher.
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
            {pageItems.map(({ wallet: w, info }) => {
              const Icon = info ? KIND_ICON[info.kind] : Gift;
              const meta = WALLET_STATUS_META[w.status];
              return (
                <Card key={w.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <p className="min-w-0 font-semibold leading-tight">
                            {info?.title ?? "Mã giảm giá"}
                          </p>
                        </div>
                        <Badge
                          variant={meta.variant}
                          className="shrink-0 whitespace-nowrap"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {info?.subtitle ?? "Chưa có thông tin chi tiết"}
                      </p>
                    </div>

                    {info && (
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-primary">
                          {info.headline}
                        </p>
                      </div>
                    )}

                    {info && info.conditions.length > 0 && (
                      <div className="space-y-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Điều kiện</p>
                        {info.conditions.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                      <span className="font-mono text-xs font-semibold">
                        #{w.voucherCode}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        HSD:{" "}
                        {w.expiredAt
                          ? formatDateTime(w.expiredAt)
                          : "Không hết hạn"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => copyCode(w.voucherCode)}
                      >
                        <Copy className="h-4 w-4" />
                        Dùng ngay
                      </Button>
                      <Button
                        variant="outline"
                        disabled={deletingId === w.id}
                        onClick={() => handleDelete(w)}
                        aria-label={`Xóa mã ${w.voucherCode}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </Button>
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

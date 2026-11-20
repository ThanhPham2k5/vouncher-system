"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BlacklistDetailDialog } from "@/components/customers/blacklist-detail-dialog";
import { BlacklistEditDialog } from "@/components/customers/blacklist-edit-dialog";
import { setBlacklistActive } from "@/lib/api/fraud";
import {
  BLACKLIST_TYPES,
  type BlackListResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { BLACKLIST_TYPE_LABEL, type SecurityData } from "./security-meta";

const PAGE_SIZE = 10;
const ALL = "ALL";

type BlockState = "ACTIVE" | "INACTIVE";

const STATE_META: Record<
  BlockState,
  { label: string; variant: "destructive" | "muted" }
> = {
  ACTIVE: { label: "Đang chặn", variant: "destructive" },
  INACTIVE: { label: "Đã gỡ chặn", variant: "muted" },
};

function stateOf(b: BlackListResponse): BlockState {
  return b.isActive ? "ACTIVE" : "INACTIVE";
}

interface PendingToggle {
  item: BlackListResponse;
  mode: "DEACTIVATE" | "REACTIVATE";
}

interface BlacklistTabProps {
  data: SecurityData;
  onAdd: () => void;
  onUpdated: (item: BlackListResponse) => void;
  onOpenCustomer: (customerId: string) => void;
}

export function BlacklistTab({
  data,
  onAdd,
  onUpdated,
  onOpenCustomer,
}: BlacklistTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [stateFilter, setStateFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [detail, setDetail] = useState<BlackListResponse | null>(null);
  const [editing, setEditing] = useState<BlackListResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return [...data.blacklist]
      .sort((a, b) => Date.parse(b.createAt) - Date.parse(a.createAt))
      .filter((b) => {
        const matchType = typeFilter === ALL || b.type === typeFilter;
        const matchState = stateFilter === ALL || stateOf(b) === stateFilter;
        const matchText = matchesSearch(
          q,
          b.value,
          b.reason,
          BLACKLIST_TYPE_LABEL[b.type],
          STATE_META[stateOf(b)].label,
          b.id,
        );
        return matchType && matchState && matchText;
      });
  }, [data.blacklist, search, typeFilter, stateFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  async function confirmToggle() {
    if (!pending) return;
    const isActive = pending.mode === "REACTIVATE";
    setBusy(true);
    try {
      const updated = await setBlacklistActive(pending.item.id, isActive);
      onUpdated(updated);
      toast.success(isActive ? "Đã chặn lại" : "Đã gỡ chặn");
      setPending(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isActive
            ? "Không chặn lại được, thử lại sau."
            : "Không gỡ chặn được, thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }

  const pendingItem = pending?.item ?? null;
  const reactivating = pending?.mode === "REACTIVATE";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo giá trị hoặc lý do..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm danh sách đen"
            />
          </div>
          <div className="lg:w-48">
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo loại">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả loại</SelectItem>
                {BLACKLIST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {BLACKLIST_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-48">
            <Select
              value={stateFilter}
              onValueChange={(v) => {
                setStateFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                {(Object.keys(STATE_META) as BlockState[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATE_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onAdd}>
            <Plus />
            Thêm vào danh sách đen
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {pageItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Chưa có bản ghi nào khớp bộ lọc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((b) => {
                  const state = stateOf(b);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        #{b.id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {BLACKLIST_TYPE_LABEL[b.type]}
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate font-mono text-sm">
                        {b.type === "CUSTOMER" ? (
                          <button
                            type="button"
                            onClick={() => onOpenCustomer(b.value)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {b.value}
                          </button>
                        ) : (
                          b.value
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATE_META[state].variant}>
                          {STATE_META[state].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {b.expiredAt
                          ? formatDateTime(b.expiredAt)
                          : "Vĩnh viễn"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetail(b)}
                            aria-label={`Xem chi tiết bản ghi #${b.id}`}
                          >
                            <Eye />
                            Chi tiết
                          </Button>
                          {state === "ACTIVE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPending({ item: b, mode: "DEACTIVATE" })
                              }
                            >
                              <ShieldOff />
                              Gỡ chặn
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPending({ item: b, mode: "REACTIVATE" })
                              }
                            >
                              <Shield />
                              Chặn lại
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(b)}
                            aria-label={`Sửa bản ghi #${b.id}`}
                          >
                            <Pencil />
                            Sửa
                          </Button>
                        </div>
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

      <Dialog
        open={!!pending}
        onOpenChange={(o) => !busy && !o && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reactivating
                ? `Chặn lại bản ghi #${pendingItem?.id}?`
                : `Gỡ chặn bản ghi #${pendingItem?.id}?`}
            </DialogTitle>
            <DialogDescription>
              {pendingItem
                ? reactivating
                  ? `${BLACKLIST_TYPE_LABEL[pendingItem.type]} ${pendingItem.value} sẽ bị chặn áp mã trở lại.`
                  : `${BLACKLIST_TYPE_LABEL[pendingItem.type]} ${pendingItem.value} sẽ áp dụng được mã giảm giá trở lại.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setPending(null)}
              disabled={busy}
            >
              Hủy bỏ
            </Button>
            <Button onClick={confirmToggle} disabled={busy}>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : reactivating ? (
                <Shield />
              ) : (
                <ShieldOff />
              )}
              {reactivating ? "Xác nhận chặn lại" : "Xác nhận gỡ chặn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BlacklistDetailDialog
        item={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
      <BlacklistEditDialog
        key={editing?.id ?? "none"}
        item={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={onUpdated}
      />
    </div>
  );
}

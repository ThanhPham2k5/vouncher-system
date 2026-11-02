"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Search, ShieldOff } from "lucide-react";
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
import { deactivateBlacklist } from "@/lib/api/fraud";
import {
  BLACKLIST_TYPES,
  type BlackListResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
  BLACKLIST_TYPE_LABEL,
  isBlacklistActive,
  type SecurityData,
} from "./security-meta";

const PAGE_SIZE = 10;
const ALL = "ALL";

type BlockState = "ACTIVE" | "INACTIVE" | "EXPIRED";

const STATE_META: Record<
  BlockState,
  { label: string; variant: "destructive" | "muted" | "warning" }
> = {
  ACTIVE: { label: "Đang chặn", variant: "destructive" },
  INACTIVE: { label: "Đã gỡ chặn", variant: "muted" },
  EXPIRED: { label: "Hết hạn", variant: "warning" },
};

function stateOf(b: BlackListResponse): BlockState {
  if (!b.isActive) return "INACTIVE";
  return isBlacklistActive(b) ? "ACTIVE" : "EXPIRED";
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
  const [target, setTarget] = useState<BlackListResponse | null>(null);
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

  async function confirmDeactivate() {
    if (!target) return;
    setBusy(true);
    try {
      const updated = await deactivateBlacklist(target.id);
      onUpdated(updated);
      toast.success("Đã gỡ chặn");
      setTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không gỡ chặn được, thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }

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
                  <TableHead>Lý do</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
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
                      <TableCell className="max-w-xs truncate text-sm">
                        {b.reason ?? "—"}
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
                      <TableCell className="text-sm">
                        {formatDateTime(b.createAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {b.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTarget(b)}
                          >
                            <ShieldOff />
                            Gỡ chặn
                          </Button>
                        ) : null}
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
        open={!!target}
        onOpenChange={(o) => !busy && !o && setTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gỡ chặn bản ghi #{target?.id}?</DialogTitle>
            <DialogDescription>
              {target
                ? `${BLACKLIST_TYPE_LABEL[target.type]} ${target.value} sẽ áp dụng được mã giảm giá trở lại.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setTarget(null)}
              disabled={busy}
            >
              Hủy bỏ
            </Button>
            <Button onClick={confirmDeactivate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ShieldOff />}
              Xác nhận gỡ chặn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

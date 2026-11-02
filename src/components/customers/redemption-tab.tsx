"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  REDEMPTION_STATUSES,
  type RedemptionStatus,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatVnd } from "@/lib/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { voucherCodeMap, type SecurityData } from "./security-meta";

const PAGE_SIZE = 10;
const ALL = "ALL";

const STATUS_META: Record<
  RedemptionStatus,
  { label: string; variant: "success" | "destructive" }
> = {
  SUCCESS: { label: "Thành công", variant: "success" },
  FAILED: { label: "Thất bại", variant: "destructive" },
};

interface RedemptionTabProps {
  data: SecurityData;
  onOpenCustomer: (customerId: string) => void;
}

export function RedemptionTab({ data, onOpenCustomer }: RedemptionTabProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);

  const codeOf = useMemo(() => voucherCodeMap(data.vouchers), [data.vouchers]);

  const counts = useMemo(() => {
    const result: Record<RedemptionStatus, number> = { SUCCESS: 0, FAILED: 0 };
    data.redemptions.forEach((r) => {
      result[r.status] += 1;
    });
    return result;
  }, [data.redemptions]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return [...data.redemptions]
      .sort((a, b) => Date.parse(b.createAt) - Date.parse(a.createAt))
      .filter((r) => {
        const matchStatus = status === ALL || r.status === status;
        const matchText = matchesSearch(
          q,
          r.customerId,
          codeOf(r.voucherId),
          r.ipAddress,
          r.deviceFingerprint,
          r.failureReason,
          STATUS_META[r.status].label,
          r.id,
        );
        return matchStatus && matchText;
      });
  }, [data.redemptions, search, status, codeOf]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo khách hàng, mã voucher, IP, thiết bị hoặc lý do..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm log đổi mã"
            />
          </div>
          <div className="lg:w-56">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  Tất cả trạng thái ({data.redemptions.length})
                </SelectItem>
                {REDEMPTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label} ({counts[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {pageItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Chưa có giao dịch nào khớp bộ lọc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Mã voucher</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Thiết bị</TableHead>
                  <TableHead className="text-right">Đơn gốc</TableHead>
                  <TableHead className="text-right">Giảm</TableHead>
                  <TableHead className="text-right">Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      #{r.id}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onOpenCustomer(r.customerId)}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {r.customerId}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {codeOf(r.voucherId)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                      {r.deviceFingerprint ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      {formatVnd(r.originalAmount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      {r.discountAmount > 0
                        ? `-${formatVnd(r.discountAmount)}`
                        : formatVnd(0)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">
                      {formatVnd(r.finalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={STATUS_META[r.status].variant}>
                          {STATUS_META[r.status].label}
                        </Badge>
                        {r.failureReason ? (
                          <p className="max-w-[12rem] text-xs text-destructive">
                            {r.failureReason}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(r.createAt)}
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
    </div>
  );
}

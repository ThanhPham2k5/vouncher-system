"use client";

import { useMemo, useState } from "react";
import { Ban, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/campaigns/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import type { BlacklistPrefill } from "./blacklist-dialog";
import {
  findActiveBlock,
  voucherCodeMap,
  type SecurityData,
} from "./security-meta";

const PAGE_SIZE = 10;
const ALL = "ALL";

interface FraudTabProps {
  data: SecurityData;
  onBlock: (prefill: BlacklistPrefill) => void;
  onOpenCustomer: (customerId: string) => void;
}

export function FraudTab({ data, onBlock, onOpenCustomer }: FraudTabProps) {
  const [search, setSearch] = useState("");
  const [rule, setRule] = useState(ALL);
  const [page, setPage] = useState(1);

  const codeOf = useMemo(() => voucherCodeMap(data.vouchers), [data.vouchers]);

  const rules = useMemo(
    () => Array.from(new Set(data.fraudLogs.map((f) => f.violationRule))),
    [data.fraudLogs],
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return [...data.fraudLogs]
      .sort((a, b) => Date.parse(b.createAt) - Date.parse(a.createAt))
      .filter((f) => {
        const matchRule = rule === ALL || f.violationRule === rule;
        const matchText = matchesSearch(
          q,
          f.customerId,
          f.ipAddress,
          f.deviceFingerprint,
          f.violationRule,
          codeOf(f.voucherId),
          f.id,
        );
        return matchRule && matchText;
      });
  }, [data.fraudLogs, search, rule, codeOf]);

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
              placeholder="Tìm theo khách hàng, IP, thiết bị, quy tắc hoặc mã voucher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm nhật ký gian lận"
            />
          </div>
          <div className="lg:w-72">
            <SearchableSelect
              aria-label="Lọc theo quy tắc vi phạm"
              value={rule}
              onValueChange={(v) => {
                setRule(v);
                setPage(1);
              }}
              searchPlaceholder="Tìm quy tắc..."
              options={[
                { value: ALL, label: "Tất cả quy tắc vi phạm" },
                ...rules.map((r) => ({ value: r, label: r })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {pageItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Chưa có nhật ký gian lận nào khớp bộ lọc.
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
                  <TableHead>Quy tắc vi phạm</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((f) => {
                  const customerBlock = findActiveBlock(
                    data.blacklist,
                    "CUSTOMER",
                    f.customerId,
                  );
                  const ipBlock = findActiveBlock(
                    data.blacklist,
                    "IP",
                    f.ipAddress,
                  );
                  const deviceBlock = findActiveBlock(
                    data.blacklist,
                    "DEVICE_FINGERPRINT",
                    f.deviceFingerprint,
                  );
                  const blocked = !!(customerBlock || ipBlock || deviceBlock);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        #{f.id}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(f.customerId)}
                          className="font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {f.customerId}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {codeOf(f.voucherId)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {f.ipAddress ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                        {f.deviceFingerprint ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-mono">
                          {f.violationRule}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(f.createAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {blocked ? (
                            <Badge variant="muted">Đã chặn</Badge>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Ban />
                                Chặn
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Chặn theo</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={!!customerBlock}
                                onSelect={() =>
                                  onBlock({
                                    type: "CUSTOMER",
                                    value: f.customerId,
                                    reason: f.violationRule,
                                  })
                                }
                              >
                                Khách hàng {f.customerId}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!f.ipAddress || !!ipBlock}
                                onSelect={() =>
                                  f.ipAddress &&
                                  onBlock({
                                    type: "IP",
                                    value: f.ipAddress,
                                    reason: f.violationRule,
                                  })
                                }
                              >
                                Địa chỉ IP
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!f.deviceFingerprint || !!deviceBlock}
                                onSelect={() =>
                                  f.deviceFingerprint &&
                                  onBlock({
                                    type: "DEVICE_FINGERPRINT",
                                    value: f.deviceFingerprint,
                                    reason: f.violationRule,
                                  })
                                }
                              >
                                Thiết bị
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  );
}

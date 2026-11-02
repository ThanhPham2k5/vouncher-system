"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { updateRateLimitConfig } from "@/lib/api/rate-limit";
import {
  LIMIT_SCOPES,
  type RateLimitConfigResponse,
} from "@/lib/campaigns/be-types";
import { formatNumber } from "@/lib/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
  ACTION_LABEL,
  LIMIT_SCOPE_LABEL,
  type SecurityData,
} from "./security-meta";

const PAGE_SIZE = 10;
const ALL = "ALL";

interface RateLimitTabProps {
  data: SecurityData;
  onCreate: () => void;
  onEdit: (item: RateLimitConfigResponse) => void;
  onUpdated: (item: RateLimitConfigResponse) => void;
}

export function RateLimitTab({
  data,
  onCreate,
  onEdit,
  onUpdated,
}: RateLimitTabProps) {
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState(ALL);
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return [...data.rateLimits]
      .sort((a, b) => a.priority - b.priority)
      .filter((c) => {
        const matchScope = scopeFilter === ALL || c.scope === scopeFilter;
        const matchActive =
          activeFilter === ALL ||
          (activeFilter === "ON" ? c.isActive : !c.isActive);
        const matchText = matchesSearch(
          q,
          c.name,
          c.endpointPattern,
          LIMIT_SCOPE_LABEL[c.scope],
          ACTION_LABEL[c.actionOnExceed],
          c.id,
        );
        return matchScope && matchActive && matchText;
      });
  }, [data.rateLimits, search, scopeFilter, activeFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  async function toggleActive(c: RateLimitConfigResponse) {
    setTogglingId(c.id);
    try {
      const updated = await updateRateLimitConfig(c.id, {
        isActive: !c.isActive,
      });
      onUpdated(updated);
      toast.success(updated.isActive ? "Đã bật cấu hình" : "Đã tắt cấu hình");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không cập nhật được, thử lại sau.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc endpoint..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm cấu hình rate limit"
            />
          </div>
          <div className="lg:w-48">
            <Select
              value={scopeFilter}
              onValueChange={(v) => {
                setScopeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo phạm vi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả phạm vi</SelectItem>
                {LIMIT_SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LIMIT_SCOPE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-44">
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                <SelectItem value="ON">Đang bật</SelectItem>
                <SelectItem value="OFF">Đã tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onCreate}>
            <Plus />
            Tạo cấu hình
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {pageItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Chưa có cấu hình nào khớp bộ lọc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>Giới hạn</TableHead>
                  <TableHead>Khi vượt ngưỡng</TableHead>
                  <TableHead className="w-20">Ưu tiên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      #{c.id}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm font-medium">
                      {c.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.endpointPattern}
                    </TableCell>
                    <TableCell className="text-sm">
                      {LIMIT_SCOPE_LABEL[c.scope]}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {formatNumber(c.maxRequest)} request /{" "}
                      {formatNumber(c.timeWindowSeconds)}s
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.actionOnExceed === "BLACKLIST"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {ACTION_LABEL[c.actionOnExceed]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{c.priority}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "success" : "muted"}>
                        {c.isActive ? "Đang bật" : "Đã tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(c)}
                          disabled={togglingId === c.id}
                        >
                          <Power />
                          {c.isActive ? "Tắt" : "Bật"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(c)}
                        >
                          <Pencil />
                          Sửa
                        </Button>
                      </div>
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

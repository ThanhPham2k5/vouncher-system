"use client";

import { BatchRulesPanel } from "@/components/rules/batch-rules-panel";
import { summarizeConfig, type RuleKind } from "@/components/rules/rule-config";
import { RuleDetailDialog } from "@/components/rules/rule-detail-dialog";
import { RuleDialog } from "@/components/rules/rule-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getRuleMetadata,
  listConditions,
  listRewards,
  listBatchRules,
} from "@/lib/api/rule-engine";
import { listVoucherBatches } from "@/lib/campaigns/service";
import type { VoucherBatchResponse } from "@/lib/campaigns/types";
import type {
  ConditionResponse,
  RewardResponse,
  RuleMetadataResponse,
  RuleStatus,
  BatchRuleResponse,
} from "@/lib/campaigns/be-types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { Eye, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Item = RewardResponse | ConditionResponse;
type TypeFilter = string; // "ALL" hoặc một RewardType / ConditionType
const PAGE_SIZE = 10;

const STATUS_BADGE: Record<
  RuleStatus,
  { label: string; variant: "success" | "muted" }
> = {
  PUBLISHED: { label: "Đã xuất bản", variant: "success" },
  DRAFT: { label: "Nháp", variant: "muted" },
};

function typeOf(kind: RuleKind, item: Item): string {
  return kind === "REWARD"
    ? (item as RewardResponse).rewardType
    : (item as ConditionResponse).conditionType;
}

interface EditorState {
  seq: number; // tăng mỗi lần mở để reset form
  item: Item | null;
}

export function RulesView() {
  const [kind, setKind] = useState<RuleKind>("REWARD");
  const [rewards, setRewards] = useState<RewardResponse[] | null>(null);
  const [conditions, setConditions] = useState<ConditionResponse[] | null>(
    null,
  );
  const [metadata, setMetadata] = useState<RuleMetadataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [seq, setSeq] = useState(0);
  const [batchMode, setBatchMode] = useState(true);
  const [batchAddSeq, setBatchAddSeq] = useState(0);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [batchRules, setBatchRules] = useState<BatchRuleResponse[] | null>(
    null,
  );
  const [batches, setBatches] = useState<VoucherBatchResponse[] | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      listRewards(),
      listConditions(),
      getRuleMetadata(),
      listBatchRules(),
      listVoucherBatches(),
    ])
      .then(([r, c, m, br, b]) => {
        if (!active) return;
        setRewards(r);
        setConditions(c);
        setMetadata(m);
        setBatchRules(br);
        setBatches(b);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách quy tắc.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const items: Item[] | null = kind === "REWARD" ? rewards : conditions;

  const typeOptions = useMemo(
    () =>
      (kind === "REWARD" ? metadata?.rewardTypes : metadata?.conditionTypes) ??
      [],
    [kind, metadata],
  );
  const labelOf = (type: string) =>
    typeOptions.find((t) => t.type === type)?.label ?? type;

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = normalizeSearch(search);
    return items.filter((it) => {
      const matchType = typeFilter === "ALL" || typeOf(kind, it) === typeFilter;
      const matchText = matchesSearch(q, it.name, it.id);
      return matchType && matchText;
    });
  }, [items, kind, search, typeFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  function switchKind(next: RuleKind) {
    setKind(next);
    setTypeFilter("ALL");
    setSearch("");
    setPage(1);
  }

  function openEditor(item: Item | null) {
    setSeq((n) => n + 1);
    setEditor({ seq: seq + 1, item });
  }

  function handleSaved(saved: Item) {
    if (kind === "REWARD") {
      setRewards((prev) => {
        const list = prev ?? [];
        return list.some((r) => r.id === saved.id)
          ? list.map((r) => (r.id === saved.id ? (saved as RewardResponse) : r))
          : [...list, saved as RewardResponse];
      });
    } else {
      setConditions((prev) => {
        const list = prev ?? [];
        return list.some((c) => c.id === saved.id)
          ? list.map((c) =>
              c.id === saved.id ? (saved as ConditionResponse) : c,
            )
          : [...list, saved as ConditionResponse];
      });
    }
  }

  const addLabel = kind === "REWARD" ? "Thêm phần thưởng" : "Thêm điều kiện";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Quy tắc khuyến mãi
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý phần thưởng và điều kiện áp dụng, dùng để ghép thành quy tắc
            cho lô mã.
          </p>
        </div>
        <Button
          onClick={() =>
            batchMode ? setBatchAddSeq((n) => n + 1) : openEditor(null)
          }
          disabled={!metadata}
        >
          <Plus />
          {batchMode ? "Thêm quy tắc lô mã" : addLabel}
        </Button>
      </div>

      <div
        role="group"
        aria-label="Chọn nhóm quy tắc"
        className="inline-flex flex-wrap rounded-lg border bg-muted/50 p-1"
      >
        {(
          [
            {
              value: "BATCH",
              label: "Quy tắc lô mã",
              count: batchRules?.length,
            },
            { value: "REWARD", label: "Phần thưởng", count: rewards?.length },
            {
              value: "CONDITION",
              label: "Điều kiện",
              count: conditions?.length,
            },
          ] as const
        ).map((opt) => {
          const active =
            opt.value === "BATCH"
              ? batchMode
              : !batchMode && kind === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (opt.value === "BATCH") {
                  setBatchMode(true);
                } else {
                  setBatchMode(false);
                  switchKind(opt.value);
                }
              }}
              className={
                active
                  ? "rounded-md bg-background px-4 py-1.5 text-sm font-medium shadow-sm"
                  : "rounded-md px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {opt.label}
              {opt.count !== undefined ? (
                <span className="ml-2 tabular-nums text-xs text-muted-foreground">
                  {opt.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {batchMode ? (
        <BatchRulesPanel
          addTrigger={batchAddSeq}
          rules={batchRules}
          rewards={rewards}
          conditions={conditions}
          batches={batches}
          metadata={metadata}
          loadError={error}
          onRetry={() => setAttempt((n) => n + 1)}
          onRulesChange={setBatchRules}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo ID hoặc tên..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  aria-label="Tìm quy tắc"
                />
              </div>
              <div className="sm:w-64">
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
                    <SelectItem value="ALL">Tất cả loại</SelectItem>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          ) : !items || !metadata ? (
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
                  Không có quy tắc nào khớp bộ lọc.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Cấu hình</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="w-44 text-right">
                          Thao tác
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((it) => {
                        const type = typeOf(kind, it);
                        const status = STATUS_BADGE[it.status];
                        return (
                          <TableRow key={it.id}>
                            <TableCell className="font-mono text-xs tabular-nums">
                              #{it.id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {it.name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {labelOf(type)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                              {summarizeConfig(kind, type, it.config)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDetailItem(it)}
                                  aria-label={`Chi tiết ${it.name}`}
                                >
                                  <Eye />
                                  Chi tiết
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={it.status !== "DRAFT"}
                                  title={
                                    it.status === "DRAFT"
                                      ? undefined
                                      : "Đã xuất bản, không thể chỉnh sửa"
                                  }
                                  onClick={() => openEditor(it)}
                                  aria-label={`Sửa ${it.name}`}
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
          )}

          <RuleDialog
            key={`${kind}-${editor?.seq ?? 0}-${editor?.item?.id ?? "new"}`}
            open={editor !== null}
            kind={kind}
            metadata={metadata}
            item={editor?.item ?? null}
            onOpenChange={(open) => {
              if (!open) setEditor(null);
            }}
            onSaved={handleSaved}
          />
          <RuleDetailDialog
            item={detailItem}
            kind={kind}
            metadata={metadata}
            onOpenChange={(open) => {
              if (!open) setDetailItem(null);
            }}
          />
        </>
      )}
    </div>
  );
}

"use client";

import { BatchRuleDialog } from "@/components/rules/batch-rule-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BatchRuleResponse,
  ConditionResponse,
  RewardResponse,
  RuleMetadataResponse,
} from "@/lib/campaigns/be-types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { Pencil, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

interface BatchRulesPanelProps {
  addTrigger: number; // tăng khi bấm thêm ở header của trang
  rules: BatchRuleResponse[] | null;
  rewards: RewardResponse[] | null;
  conditions: ConditionResponse[] | null;
  metadata: RuleMetadataResponse | null;
  loadError: string | null;
  onRetry: () => void;
  onRulesChange: (next: BatchRuleResponse[]) => void;
}

interface EditorState {
  seq: number; // tăng mỗi lần mở để reset form
  item: BatchRuleResponse | null;
  open: boolean;
}

export function BatchRulesPanel({
  addTrigger,
  rules,
  rewards,
  conditions,
  metadata,
  loadError,
  onRetry,
  onRulesChange,
}: BatchRulesPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState>({
    seq: 0,
    item: null,
    open: false,
  });

  const ready =
    rules !== null &&
    rewards !== null &&
    conditions !== null &&
    metadata !== null;

  function openEditor(item: BatchRuleResponse | null) {
    setEditor((prev) => ({ seq: prev.seq + 1, item, open: true }));
  }

  // Nút thêm nằm ở header của trang (rules-view), tăng addTrigger để mở dialog
  useEffect(() => {
    if (addTrigger > 0) openEditor(null);
  }, [addTrigger]);

  const rewardName = (id: number) =>
    rewards?.find((r) => r.id === id)?.name ?? `Phần thưởng #${id}`;
  const conditionName = (id: number) =>
    conditions?.find((c) => c.id === id)?.name ?? `Điều kiện #${id}`;

  const filtered = useMemo(() => {
    if (!rules) return [];
    const q = normalizeSearch(search);
    return rules.filter((r) =>
      matchesSearch(
        q,
        rewards?.find((x) => x.id === r.rewardId)?.name ?? "",
        conditions?.find((x) => x.id === r.conditionId)?.name ?? "",
        r.id,
      ),
    );
  }, [rules, rewards, conditions, search]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  // Cập nhật danh sách ở trang cha, không tải lại toàn bộ
  function handleSaved(saved: BatchRuleResponse) {
    if (!rules) return;
    onRulesChange(
      rules.some((r) => r.id === saved.id)
        ? rules.map((r) => (r.id === saved.id ? saved : r))
        : [...rules, saved],
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo ID, phần thưởng hoặc điều kiện..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm quy tắc lô mã"
            />
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Không tải được dữ liệu</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : !ready ? (
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
              Chưa có quy tắc lô mã nào khớp.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Phần thưởng</TableHead>
                    <TableHead>Điều kiện</TableHead>
                    <TableHead className="w-44 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        #{r.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {rewardName(r.rewardId)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {conditionName(r.conditionId)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditor(r)}
                            aria-label={`Sửa quy tắc lô #${r.id}`}
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
      )}

      {ready && (
        <BatchRuleDialog
          key={editor.seq}
          open={editor.open}
          item={editor.item}
          rewards={rewards}
          conditions={conditions}
          onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

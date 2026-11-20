"use client";

import { ActivateBatchDialog } from "@/components/campaigns/activate-batch-dialog";
import { BatchEditDialog } from "@/components/campaigns/batch-edit-dialog";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { EndCampaignDialog } from "@/components/campaigns/end-campaign-dialog";
import { PauseCampaignDialog } from "@/components/campaigns/pause-campaign-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  BATCH_STATUS_LABEL,
  BATCH_TYPE_LABEL,
  CHARSET_LABEL,
  DISTRIBUTION_LABEL,
  DURATION_LABEL,
  formatDateTime,
  quotaOf,
} from "@/lib/campaigns/format";
import {
  activateCampaignBatch,
  getCampaign,
  setCampaignStatus,
} from "@/lib/campaigns/service";
import type {
  CampaignView,
  Charset,
  VoucherBatchResponse,
} from "@/lib/campaigns/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Rocket,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

const BATCH_PAGE_SIZE = 5;

export function CampaignDetail({ campaignId }: { campaignId: number }) {
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [batchPage, setBatchPage] = useState(1);

  const [editBatch, setEditBatch] = useState<VoucherBatchResponse | null>(null);
  const [activateBatch, setActivateBatch] =
    useState<VoucherBatchResponse | null>(null);
  const [activating, setActivating] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCampaign(campaignId)
      .then((c) => {
        if (!active) return;
        if (c) setCampaign(c);
        else setNotFound(true);
      })
      .catch(() => {
        if (active) toast.error("Không tải được chiến dịch");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  // Tải lại chiến dịch và lô mã sau khi sửa hoặc kích hoạt lô
  async function reload() {
    try {
      const c = await getCampaign(campaignId);
      if (c) setCampaign(c);
    } catch {
      toast.error("Không tải lại được chiến dịch");
    }
  }

  async function changeStatus(next: "ACTIVE" | "PAUSED" | "ENDED") {
    if (!campaign) return;
    setBusy(true);
    try {
      const updated = await setCampaignStatus(campaign.id, next);
      setCampaign(updated);
      toast.success(
        next === "PAUSED"
          ? "Đã tạm dừng chiến dịch"
          : next === "ENDED"
            ? "Đã kết thúc chiến dịch"
            : "Đã kích hoạt chiến dịch",
      );
    } catch (err) {
      toast.error("Không cập nhật được trạng thái", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      setPauseOpen(false);
      setEndOpen(false);
    }
  }

  async function confirmActivate() {
    if (!activateBatch) return;
    const batchId = activateBatch.id;
    setActivating(true);
    try {
      await activateCampaignBatch(batchId);
      setActivateBatch(null);
      setGeneratingIds((prev) => new Set(prev).add(batchId));
      toast.info(`Đang sinh mã cho lô #${batchId}`);
      void waitForGeneration(batchId);
    } catch (err) {
      toast.error("Không kích hoạt được lô mã", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActivating(false);
    }
  }

  // BE sinh mã nền và không có trạng thái trung gian, nên FE hỏi lại cho đến khi lô là GENERATED (tối đa 60 giây)
  async function waitForGeneration(batchId: number) {
    const deadline = Date.now() + 60_000;
    try {
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const c = await getCampaign(campaignId);
        if (!c) break;
        setCampaign(c);
        if (c.batches.find((b) => b.id === batchId)?.status === "GENERATED") {
          toast.success(`Đã sinh xong mã cho lô #${batchId}`);
          return;
        }
      }
      toast.warning(`Lô #${batchId} chưa sinh xong, vui lòng tải lại sau`);
    } catch {
      toast.error("Không kiểm tra được trạng thái lô");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <p className="font-semibold">Không tìm thấy chiến dịch</p>
          <p className="text-sm text-muted-foreground">
            Chiến dịch #{campaignId} có thể đã bị xóa hoặc không tồn tại.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/campaigns">
              <ArrowLeft />
              Quay lại danh sách
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // generatedCount: số mã sinh ra. maxUsageCount: số lần dùng tối đa. redeemedCount: số lần đã dùng.
  const maxUsage = campaign.batches.reduce(
    (sum, b) => sum + b.maxUsageCount,
    0,
  );
  const redeemed = campaign.batches.reduce(
    (sum, b) => sum + b.redeemedCount,
    0,
  );
  const usedPct = maxUsage === 0 ? 0 : (redeemed / maxUsage) * 100;

  const batchPageCount = pageCountOf(campaign.batches.length, BATCH_PAGE_SIZE);
  const safeBatchPage = clampPage(batchPage, batchPageCount);
  const batchItems = paginate(campaign.batches, safeBatchPage, BATCH_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/admin/campaigns">
          <ArrowLeft />
          Quay lại danh sách
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign.name}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            # {campaign.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status !== "ENDED" && (
            <Button asChild variant="outline">
              <Link href={`/admin/campaigns/${campaign.id}/edit`}>
                <Pencil />
                Chỉnh sửa
              </Link>
            </Button>
          )}
          {campaign.status === "ACTIVE" && (
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
              onClick={() => setPauseOpen(true)}
              disabled={busy}
            >
              <Pause />
              Tạm dừng
            </Button>
          )}
          {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
            <Button onClick={() => changeStatus("ACTIVE")} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
              Kích hoạt
            </Button>
          )}
          {(campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
            <Button
              variant="destructive"
              onClick={() => setEndOpen(true)}
              disabled={busy}
            >
              <StopCircle />
              Kết thúc
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cấu hình chiến dịch</CardTitle>
            <CardDescription>
              Thông tin chung và phạm vi thời gian áp dụng
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="ID chiến dịch"
              value={<span className="font-mono">{campaign.id}</span>}
            />
            <InfoItem
              label="Admin tạo"
              value={<span className="font-mono">#{campaign.adminId}</span>}
            />
            <InfoItem
              label="Bắt đầu"
              value={formatDateTime(campaign.startTime)}
            />
            <InfoItem
              label="Kết thúc"
              value={formatDateTime(campaign.endTime)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiến độ sử dụng</CardTitle>
            <CardDescription>
              Số lượt đã dùng so với số lượt tối đa của các lô
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Lượt đã dùng</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(redeemed)}
              </p>
              <p className="text-xs text-muted-foreground">
                trên {formatNumber(maxUsage)} lượt tối đa (
                {formatPercent(usedPct)})
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(100, usedPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách lô mã</CardTitle>
          <CardDescription>
            Mỗi lô gắn với đúng một quy tắc áp dụng. Chỉ lô chưa sinh mã mới
            được chỉnh sửa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lô mã</TableHead>
                <TableHead>Loại lô</TableHead>
                <TableHead>Mã & tiền tố</TableHead>
                <TableHead>Quy tắc</TableHead>
                <TableHead className="whitespace-nowrap">
                  <div className="w-32">Đã dùng / Tối đa</div>
                </TableHead>
                <TableHead>Quota kênh</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead className="whitespace-nowrap text-center">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchItems.map((b) => {
                const generating = generatingIds.has(b.id);
                const editable = b.status === "DRAFT" && !generating;
                const batchPct =
                  b.maxUsageCount === 0
                    ? 0
                    : (b.redeemedCount / b.maxUsageCount) * 100;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      #{b.id}
                      <p className="font-sans text-xs font-normal text-muted-foreground">
                        {generating
                          ? "Đang sinh mã…"
                          : BATCH_STATUS_LABEL[b.status]}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {BATCH_TYPE_LABEL[b.batchType]}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">{b.codeConfig.prefix}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.codeConfig.length} ký tự ·{" "}
                        {CHARSET_LABEL[b.codeConfig.charset as Charset] ??
                          b.codeConfig.charset}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      Quy tắc #{b.ruleId}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="w-32 space-y-1.5">
                        <div className="flex justify-between text-xs tabular-nums">
                          <span>
                            {formatNumber(b.redeemedCount)} /{" "}
                            {formatNumber(b.maxUsageCount)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPercent(batchPct)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.min(100, batchPct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.batchType === "GENERIC" ? (
                        <p className="text-muted-foreground">Không giới hạn</p>
                      ) : (
                        <>
                          <p>
                            {DISTRIBUTION_LABEL.EMAIL}:{" "}
                            {formatNumber(
                              quotaOf(b.distributionChannels, "EMAIL"),
                            )}
                          </p>
                          <p>
                            {DISTRIBUTION_LABEL.WEBHOOK}:{" "}
                            {formatNumber(
                              quotaOf(b.distributionChannels, "WEBHOOK"),
                            )}
                          </p>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.durationValue}{" "}
                      {DURATION_LABEL[b.durationUnit].toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            editable
                              ? "Chỉnh sửa lô"
                              : "Lô đã sinh mã, không thể chỉnh sửa"
                          }
                          aria-label={`Chỉnh sửa lô #${b.id}`}
                          disabled={!editable}
                          onClick={() => setEditBatch(b)}
                        >
                          <Pencil />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Thao tác lô #${b.id}`}
                              disabled={generating}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Vận hành lô</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {editable ? (
                              <DropdownMenuItem
                                onSelect={() => setActivateBatch(b)}
                              >
                                <Rocket />
                                Kích hoạt tạo mã
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                {generating ? "Đang sinh mã…" : "Đã sinh mã"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationBar
            total={campaign.batches.length}
            page={safeBatchPage}
            pageSize={BATCH_PAGE_SIZE}
            pageCount={batchPageCount}
            onPageChange={setBatchPage}
          />
        </CardContent>
      </Card>

      <BatchEditDialog
        batch={editBatch}
        onOpenChange={(open) => {
          if (!open) setEditBatch(null);
        }}
        onSaved={async () => {
          setEditBatch(null);
          await reload();
        }}
      />

      <ActivateBatchDialog
        batch={activateBatch}
        busy={activating}
        onOpenChange={(open) => {
          if (!open) setActivateBatch(null);
        }}
        onConfirm={confirmActivate}
      />

      <PauseCampaignDialog
        key={campaign.id}
        campaign={pauseOpen ? campaign : null}
        busy={busy}
        onOpenChange={setPauseOpen}
        onConfirm={() => changeStatus("PAUSED")}
      />
      <EndCampaignDialog
        campaign={endOpen ? campaign : null}
        busy={busy}
        onOpenChange={setEndOpen}
        onConfirm={() => changeStatus("ENDED")}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

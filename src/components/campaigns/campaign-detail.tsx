"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Pause, Pencil, Play, Rocket } from "lucide-react";
import { toast } from "sonner";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { PauseCampaignDialog } from "@/components/campaigns/pause-campaign-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DURATION_LABEL,
  formatDateTime,
} from "@/lib/campaigns/format";
import { getCampaign, setCampaignStatus } from "@/lib/campaigns/service";
import type { CampaignResponse } from "@/lib/campaigns/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";

export function CampaignDetail({ campaignId }: { campaignId: number }) {
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [batchPage, setBatchPage] = useState(1);

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

  async function changeStatus(
    next: "ACTIVE" | "PAUSED",
    notifyWebhook = false,
  ) {
    if (!campaign) return;
    setBusy(true);
    try {
      const updated = await setCampaignStatus(campaign.id, next);
      setCampaign(updated);
      toast.success(
        next === "PAUSED"
          ? "Đã tạm dừng chiến dịch"
          : "Đã kích hoạt chiến dịch",
        {
          description: notifyWebhook
            ? "Đã gửi thông báo webhook tới các kênh đối tác."
            : undefined,
        },
      );
    } catch (err) {
      toast.error("Không cập nhật được trạng thái", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      setPauseOpen(false);
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

  const generated = campaign.voucherBatches.reduce(
    (sum, b) => sum + b.generatedCount,
    0,
  );
  const redeemed = campaign.voucherBatches.reduce(
    (sum, b) => sum + b.redeemedCount,
    0,
  );
  const usedPct = generated === 0 ? 0 : (redeemed / generated) * 100;
  const BATCH_PAGE_SIZE = 5;
  const batchPageCount = pageCountOf(
    campaign.voucherBatches.length,
    BATCH_PAGE_SIZE,
  );
  const safeBatchPage = clampPage(batchPage, batchPageCount);
  const batchItems = paginate(
    campaign.voucherBatches,
    safeBatchPage,
    BATCH_PAGE_SIZE,
  );

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
              {campaign.campaignName}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            # {campaign.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/campaigns/${campaign.id}/edit`}>
              <Pencil />
              Chỉnh sửa
            </Link>
          </Button>
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
          {campaign.status === "PAUSED" && (
            <Button onClick={() => changeStatus("ACTIVE")} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Play />}
              Tiếp tục
            </Button>
          )}
          {campaign.status === "DRAFT" && (
            <Button onClick={() => changeStatus("ACTIVE")} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
              Kích hoạt
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
              value={<span className="font-mono">#{campaign.admin.id}</span>}
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
              Số mã đã dùng so với số mã đã sinh
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Mã đã sử dụng</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(redeemed)}
              </p>
              <p className="text-xs text-muted-foreground">
                trên {formatNumber(generated)} mã đã sinh (
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
          <CardTitle className="text-base">
            Danh sách lô mã (Voucher batches)
          </CardTitle>
          <CardDescription>
            Mỗi lô gắn với đúng một quy tắc áp dụng
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
                <TableHead className="w-56">Đã sinh / Đã dùng</TableHead>
                <TableHead>Quota kênh</TableHead>
                <TableHead>Hiệu lực</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchItems.map((b) => {
                const batchPct =
                  b.generatedCount === 0
                    ? 0
                    : (b.redeemedCount / b.generatedCount) * 100;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      #{b.id}
                      <p className="font-sans text-xs font-normal text-muted-foreground">
                        {BATCH_STATUS_LABEL[b.status]}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {BATCH_TYPE_LABEL[b.batchType]}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">
                        {b.codeConfigJson.prefix}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.codeConfigJson.length} ký tự ·{" "}
                        {CHARSET_LABEL[b.codeConfigJson.charset]}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      Rule #{b.rule.id}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs tabular-nums">
                          <span>
                            {formatNumber(b.redeemedCount)} /{" "}
                            {formatNumber(b.generatedCount)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPercent(batchPct)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${batchPct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>
                        Email: {formatNumber(b.distributionChannelsJson.email)}
                      </p>
                      <p>
                        Webhook:{" "}
                        {formatNumber(b.distributionChannelsJson.webhook)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.durationValue}{" "}
                      {DURATION_LABEL[b.durationUnit].toLowerCase()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationBar
            total={campaign.voucherBatches.length}
            page={safeBatchPage}
            pageSize={BATCH_PAGE_SIZE}
            pageCount={batchPageCount}
            onPageChange={setBatchPage}
          />
        </CardContent>
      </Card>

      <PauseCampaignDialog
        key={campaign.id}
        campaign={pauseOpen ? campaign : null}
        busy={busy}
        onOpenChange={setPauseOpen}
        onConfirm={(notify) => changeStatus("PAUSED", notify)}
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

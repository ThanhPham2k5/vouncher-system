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
  BATCH_TYPE_LABEL,
  CHARSET_LABEL,
  DURATION_LABEL,
  formatDateTime,
} from "@/lib/campaigns/format";
import { getCampaign, setCampaignStatus } from "@/lib/campaigns/service";
import type { Campaign, CampaignStatus } from "@/lib/campaigns/types";
import { formatNumber, formatPercent, formatVnd } from "@/lib/format";

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function changeStatus(next: CampaignStatus, notifyWebhook = false) {
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
    } catch {
      toast.error("Không cập nhật được trạng thái");
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
            Chiến dịch {campaignId} có thể đã bị xóa hoặc không tồn tại.
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

  const remaining = campaign.budgetTotal - campaign.budgetSpent;
  const spentPct =
    campaign.budgetTotal === 0
      ? 0
      : (campaign.budgetSpent / campaign.budgetTotal) * 100;
  const thresholdPct =
    campaign.budgetTotal === 0
      ? 0
      : (campaign.budgetThreshold / campaign.budgetTotal) * 100;
  const overThreshold = campaign.budgetSpent >= campaign.budgetThreshold;

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
              label="Mã định danh hệ thống"
              value={<span className="font-mono">{campaign.id}</span>}
            />
            <InfoItem
              label="Admin phụ trách"
              value={<span className="font-mono">{campaign.adminId}</span>}
            />
            <InfoItem
              label="Bắt đầu"
              value={formatDateTime(campaign.startTime)}
            />
            <InfoItem
              label="Kết thúc"
              value={formatDateTime(campaign.endTime)}
            />
            <div className="sm:col-span-2">
              <InfoItem
                label="Mô tả nghiệp vụ & mục tiêu"
                value={campaign.description || "Chưa có mô tả"}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giám sát ngân sách</CardTitle>
            <CardDescription>
              Chi tiêu thực tế so với hạn mức cấp phát
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Đã chi / Tiêu dùng thực tế
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {formatVnd(campaign.budgetSpent)}
              </p>
              <p className="text-xs text-muted-foreground">
                Tương đương {formatPercent(spentPct)} trên tổng ngân sách
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${overThreshold ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, spentPct)}%` }}
                />
                <div
                  className="absolute -top-1 h-4 w-0.5 bg-destructive"
                  style={{ left: `${thresholdPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 ₫</span>
                <span className="text-destructive">
                  Ngưỡng: {formatVnd(campaign.budgetThreshold)}
                </span>
                <span>{formatVnd(campaign.budgetTotal)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-4 text-sm">
              <p
                className={
                  overThreshold
                    ? "font-medium text-amber-600 dark:text-amber-400"
                    : "font-medium text-emerald-600 dark:text-emerald-400"
                }
              >
                {overThreshold
                  ? "Đã vượt ngưỡng cảnh báo"
                  : "Trong ngưỡng an toàn"}
              </p>
              <p className="mt-1 text-muted-foreground">
                Ngân sách còn lại:{" "}
                <span className="font-semibold text-foreground">
                  {formatVnd(Math.max(0, remaining))}
                </span>
              </p>
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
              {campaign.batches.map((b) => {
                const redeemedPct =
                  b.generatedCount === 0
                    ? 0
                    : (b.redeemedCount / b.generatedCount) * 100;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {b.id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {BATCH_TYPE_LABEL[b.batchType]}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">{b.prefix}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.length} ký tự · {CHARSET_LABEL[b.charset]}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.ruleId}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs tabular-nums">
                          <span>
                            {formatNumber(b.redeemedCount)} /{" "}
                            {formatNumber(b.generatedCount)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPercent(redeemedPct)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${redeemedPct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>Email: {formatNumber(b.quotaEmail)}</p>
                      <p>Webhook: {formatNumber(b.quotaWebhook)}</p>
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

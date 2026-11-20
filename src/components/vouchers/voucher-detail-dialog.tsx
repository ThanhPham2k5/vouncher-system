"use client";

import {
  configSections,
  summarizeConfig,
  type RuleKind,
} from "@/components/rules/rule-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomerVouchers } from "@/lib/api/vouchers";
import type {
  BatchStatus,
  BatchType,
  CampaignStatus,
  CustomerVoucherResponse,
  JsonObject,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatNumber } from "@/lib/format";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WALLET_STATUS_META } from "./voucher-status";

const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ENDED: "Đã kết thúc",
};

const BATCH_TYPE_LABEL: Record<BatchType, string> = {
  GENERIC: "Mã dùng chung",
  BULK: "Mã dùng riêng",
};

const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: "Nháp",
  GENERATED: "Đã sinh mã",
};

interface VoucherDetailDialogProps {
  voucher: VoucherResponse | null;
  onOpenChange: (open: boolean) => void;
}

// Đặt key theo id voucher ở nơi gọi để tải lại ví mỗi lần mở
export function VoucherDetailDialog({
  voucher,
  onOpenChange,
}: VoucherDetailDialogProps) {
  const [wallet, setWallet] = useState<CustomerVoucherResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!voucher) return;
    let active = true;
    setWallet(null);
    setError(null);
    listCustomerVouchers({ voucherId: voucher.id })
      .then((data) => {
        if (active) setWallet(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách ví khách hàng.");
      });
    return () => {
      active = false;
    };
  }, [voucher, attempt]);

  const batch = voucher?.batch;
  const campaign = voucher?.campaign;

  return (
    <Dialog open={!!voucher} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{voucher?.code}</DialogTitle>
          <DialogDescription>
            {campaign?.name} · Lô #{batch?.id}
          </DialogDescription>
        </DialogHeader>

        {voucher && batch && campaign ? (
          <div className="space-y-5 text-sm">
            <dl className="rounded-lg border px-4 py-1">
              <InfoRow label="ID mã (voucher)">#{voucher.id}</InfoRow>
              <InfoRow label="Ngày tạo">
                {formatDateTime(voucher.createdAt)}
              </InfoRow>
              <InfoRow label="Chiến dịch">
                {campaign.name}{" "}
                <Badge variant="muted">
                  {CAMPAIGN_STATUS_LABEL[campaign.status]}
                </Badge>
              </InfoRow>
              <InfoRow label="Thời gian chiến dịch">
                {formatDateTime(campaign.startTime)} →{" "}
                {formatDateTime(campaign.endTime)}
              </InfoRow>
              <InfoRow label="Lô">
                #{batch.id} · {BATCH_TYPE_LABEL[batch.batchType]} ·{" "}
                {BATCH_STATUS_LABEL[batch.status]}
              </InfoRow>
              <InfoRow label="Số mã đã sinh">
                {formatNumber(batch.generatedCount)}
              </InfoRow>
              <InfoRow label="Lượt sử dụng tối đa">
                {formatNumber(
                  batch.batchType === "BULK" ? 1 : batch.maxUsageCount,
                )}
              </InfoRow>
              <InfoRow label="Đã sử dụng">
                {formatNumber(batch.redeemedCount)}
              </InfoRow>
            </dl>

            <ConfigPanel
              kind="REWARD"
              title="Phần thưởng"
              name={voucher.reward.name}
              type={voucher.reward.type}
              config={voucher.reward.config}
            />

            <ConfigPanel
              kind="CONDITION"
              title="Điều kiện"
              name={voucher.condition.name}
              type={voucher.condition.type}
              config={voucher.condition.config}
            />
          </div>
        ) : null}

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ví khách hàng đang giữ mã này
          </p>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Không tải được dữ liệu</AlertTitle>
              <AlertDescription>
                <span>{error}</span>{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Thử lại
                </button>
              </AlertDescription>
            </Alert>
          ) : !wallet ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : wallet.length === 0 ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              Chưa có khách hàng nào nhận mã này.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Nhận lúc</TableHead>
                    <TableHead>Hết hạn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.map((w) => {
                    const meta = WALLET_STATUS_META[w.status];
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">
                          KH #{w.customerId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(w.claimedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.expiredAt
                            ? formatDateTime(w.expiredAt)
                            : "Không hết hạn"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function ConfigPanel({
  kind,
  title,
  name,
  type,
  config,
}: {
  kind: RuleKind;
  title: string;
  name: string;
  type: string;
  config: unknown;
}) {
  const cfg = (config ?? {}) as JsonObject;
  const sections = configSections(kind, type, cfg);

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="font-semibold">
          {name}{" "}
          <span className="font-normal text-muted-foreground">· {type}</span>
        </p>
        <p>{summarizeConfig(kind, type, cfg)}</p>
      </div>

      {sections.map((section, i) => (
        <dl key={i} className="rounded-lg border px-4 py-1">
          {section.title ? (
            <div className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </div>
          ) : null}
          {section.lines.map((line) => (
            <InfoRow key={line.label} label={line.label}>
              {line.value}
            </InfoRow>
          ))}
        </dl>
      ))}
    </div>
  );
}

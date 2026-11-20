"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  RedemptionLogResponse,
  RedemptionStatus,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatVnd } from "@/lib/format";

const STATUS_META: Record<
  RedemptionStatus,
  { label: string; variant: "success" | "destructive" }
> = {
  SUCCESS: { label: "Thành công", variant: "success" },
  FAILED: { label: "Thất bại", variant: "destructive" },
};

interface RedemptionDetailDialogProps {
  log: RedemptionLogResponse | null;
  voucher: VoucherResponse | undefined;
  onOpenChange: (open: boolean) => void;
}

export function RedemptionDetailDialog({
  log,
  voucher,
  onOpenChange,
}: RedemptionDetailDialogProps) {
  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {log && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Chi tiết log đổi mã #{log.id}</DialogTitle>
                <Badge variant={STATUS_META[log.status].variant}>
                  {STATUS_META[log.status].label}
                </Badge>
              </div>
              <DialogDescription>
                KH {log.customerId} · {voucher?.code ?? `#${log.voucherId}`}
              </DialogDescription>
            </DialogHeader>

            <Section title="Thông tin voucher">
              <Row label="Mã voucher">
                <span className="font-mono">
                  {voucher?.code ?? `#${log.voucherId}`}
                </span>
              </Row>
              <Row label="ID voucher">#{log.voucherId}</Row>
              <Row label="Chiến dịch">{voucher?.campaign.name ?? "—"}</Row>
              <Row label="Lô">{voucher ? `#${voucher.batch.id}` : "—"}</Row>
            </Section>

            <Section title="Thông tin giao dịch">
              <Row label="Khách hàng">
                <span className="font-mono">{log.customerId}</span>
              </Row>
              <Row label="Thời gian">{formatDateTime(log.createAt)}</Row>
              <Row label="Trạng thái">{STATUS_META[log.status].label}</Row>
              <Row label="Đơn gốc">{formatVnd(log.originalAmount)}</Row>
              <Row label="Giảm">
                {log.discountAmount > 0
                  ? `-${formatVnd(log.discountAmount)}`
                  : formatVnd(0)}
              </Row>
              <Row label="Thanh toán">{formatVnd(log.finalAmount)}</Row>
              <Row label="Lý do thất bại">
                <span
                  className={log.failureReason ? "text-destructive" : undefined}
                >
                  {log.failureReason || "—"}
                </span>
              </Row>
            </Section>

            <Section title="Thông tin kỹ thuật">
              <Row label="Địa chỉ IP">
                <span className="font-mono">{log.ipAddress || "—"}</span>
              </Row>
              <Row label="Mã thiết bị">
                {log.deviceFingerprint ? (
                  <span className="break-all font-mono text-xs">
                    {log.deviceFingerprint}
                  </span>
                ) : (
                  "—"
                )}
              </Row>
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <dl className="divide-y rounded-lg border px-4 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{children}</dd>
    </div>
  );
}

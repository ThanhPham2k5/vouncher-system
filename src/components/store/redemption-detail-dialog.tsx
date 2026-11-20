"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RedemptionRecord } from "@/lib/store-history";

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}

interface RedemptionDetailDialogProps {
  record: RedemptionRecord | null;
  onOpenChange: (open: boolean) => void;
}

export function RedemptionDetailDialog({
  record,
  onOpenChange,
}: RedemptionDetailDialogProps) {
  const success = record?.status === "SUCCESS";
  const paid = record ? record.originalAmount - record.discountAmount : 0;
  const savingPct =
    record && record.originalAmount > 0
      ? ((record.discountAmount / record.originalAmount) * 100).toFixed(1)
      : "0";

  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {record && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Chi tiết lần áp mã khuyến mãi</DialogTitle>
                {success ? (
                  <Badge variant="success">Áp mã thành công</Badge>
                ) : (
                  <Badge variant="destructive">Thất bại</Badge>
                )}
              </div>
              <DialogDescription className="font-mono text-xs">
                Mã giao dịch: #{record.transactionRef} •{" "}
                {formatDateTime(record.appliedAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Giá trị đơn gốc</p>
                <p className="font-semibold">
                  {formatVnd(record.originalAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  Mức chiết khấu thực tế
                </p>
                <p className="font-semibold text-primary">
                  {success ? `-${formatVnd(record.discountAmount)}` : "0 ₫"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tiết kiệm {savingPct}% đơn hàng
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Thực thu sau áp mã
                </p>
                <p className="font-semibold text-primary">{formatVnd(paid)}</p>
              </div>
            </div>

            <Section title="Thông tin voucher">
              <Row label="Mã voucher">
                <span className="font-mono">{record.code}</span>
              </Row>
              <Row label="Chiến dịch">{record.campaignTitle || "—"}</Row>
              <Row label="Phần thưởng">{record.headline || "—"}</Row>
              <Row label="Điều kiện">
                {record.conditions.length > 0 ? (
                  <ul className="space-y-0.5">
                    {record.conditions.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </Row>
            </Section>

            <Section title="Thông tin giao dịch">
              <Row label="Mã lần áp">#{record.id}</Row>
              <Row label="ID voucher">#{record.voucherId}</Row>
              <Row label="Thời điểm">{formatDateTime(record.appliedAt)}</Row>
              <Row label="Trạng thái">
                {success ? "Thành công" : "Thất bại"}
              </Row>
              <Row label="Giá trị đơn gốc">
                {formatVnd(record.originalAmount)}
              </Row>
              <Row label="Số tiền giảm">
                {success ? formatVnd(record.discountAmount) : "0 ₫"}
              </Row>
              <Row label="Thực thu">{formatVnd(record.finalAmount)}</Row>
              <Row label="Lý do thất bại">
                <span className={success ? "" : "text-destructive"}>
                  {record.failureReason || "—"}
                </span>
              </Row>
            </Section>

            <Section title="Thông tin kỹ thuật">
              <Row label="Địa chỉ IP">{record.ipAddress || "—"}</Row>
              <Row label="Mã thiết bị">
                {record.deviceFingerprint ? (
                  <span className="break-all font-mono text-xs">
                    {record.deviceFingerprint}
                  </span>
                ) : (
                  "—"
                )}
              </Row>
            </Section>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng cửa sổ
              </Button>
            </DialogFooter>
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

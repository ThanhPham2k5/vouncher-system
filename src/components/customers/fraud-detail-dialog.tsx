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
  BlackListResponse,
  FraudLogResponse,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { findActiveBlock } from "./security-meta";

interface FraudDetailDialogProps {
  log: FraudLogResponse | null;
  voucher: VoucherResponse | undefined;
  blacklist: BlackListResponse[];
  onOpenChange: (open: boolean) => void;
}

export function FraudDetailDialog({
  log,
  voucher,
  blacklist,
  onOpenChange,
}: FraudDetailDialogProps) {
  const customerBlocked = log
    ? !!findActiveBlock(blacklist, "CUSTOMER", log.customerId)
    : false;
  const ipBlocked = log
    ? !!findActiveBlock(blacklist, "IP", log.ipAddress)
    : false;
  const deviceBlocked = log
    ? !!findActiveBlock(blacklist, "DEVICE_FINGERPRINT", log.deviceFingerprint)
    : false;

  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {log && (
          <>
            <DialogHeader>
              <DialogTitle>Chi tiết nhật ký gian lận #{log.id}</DialogTitle>
              <DialogDescription>
                KH {log.customerId} · {voucher?.code ?? `#${log.voucherId}`}
              </DialogDescription>
            </DialogHeader>

            <Section title="Vi phạm">
              <Row label="Quy tắc vi phạm">
                <Badge variant="destructive" className="font-mono">
                  {log.violationRule}
                </Badge>
              </Row>
              <Row label="Thời gian">{formatDateTime(log.createAt)}</Row>
              <Row label="Mã voucher">
                <span className="font-mono">
                  {voucher?.code ?? `#${log.voucherId}`}
                </span>
              </Row>
              <Row label="ID voucher">#{log.voucherId}</Row>
              <Row label="Chiến dịch">{voucher?.campaign.name ?? "—"}</Row>
              <Row label="Lô">{voucher ? `#${voucher.batch.id}` : "—"}</Row>
            </Section>

            <Section title="Khách hàng và kỹ thuật">
              <Row label="Khách hàng">
                <span className="font-mono">{log.customerId}</span>
              </Row>
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

            <Section title="Trạng thái chặn">
              <Row label="Khách hàng">
                <BlockStatus blocked={customerBlocked} />
              </Row>
              <Row label="Địa chỉ IP">
                {log.ipAddress ? <BlockStatus blocked={ipBlocked} /> : "—"}
              </Row>
              <Row label="Thiết bị">
                {log.deviceFingerprint ? (
                  <BlockStatus blocked={deviceBlocked} />
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

function BlockStatus({ blocked }: { blocked: boolean }) {
  return blocked ? (
    <Badge variant="muted">Đã chặn</Badge>
  ) : (
    <span className="text-muted-foreground">Chưa chặn</span>
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

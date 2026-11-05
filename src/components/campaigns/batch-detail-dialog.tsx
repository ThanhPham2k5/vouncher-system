"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BATCH_STATUS_LABEL,
  BATCH_TYPE_LABEL,
  CHARSET_LABEL,
  DISTRIBUTION_LABEL,
  DURATION_LABEL,
  quotaOf,
} from "@/lib/campaigns/format";
import type { Charset, VoucherBatchResponse } from "@/lib/campaigns/types";
import { formatNumber, formatPercent } from "@/lib/format";

interface BatchDetailDialogProps {
  batch: VoucherBatchResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function BatchDetailDialog({
  batch,
  onOpenChange,
}: BatchDetailDialogProps) {
  const usedPct =
    batch && batch.generatedCount > 0
      ? (batch.redeemedCount / batch.generatedCount) * 100
      : 0;

  return (
    <Dialog open={!!batch} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết lô mã #{batch?.id}</DialogTitle>
          <DialogDescription>
            Cấu hình và tiến độ sử dụng của lô mã
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Item label="Trạng thái" value={BATCH_STATUS_LABEL[batch.status]} />
            <Item label="Loại lô" value={BATCH_TYPE_LABEL[batch.batchType]} />
            <Item label="Quy tắc áp dụng" value={`Rule #${batch.ruleId}`} />
            <Item
              label="Tiền tố mã"
              value={
                <span className="font-mono">{batch.codeConfig.prefix}</span>
              }
            />
            <Item
              label="Chuỗi ngẫu nhiên"
              value={`${batch.codeConfig.length} ký tự · ${
                CHARSET_LABEL[batch.codeConfig.charset as Charset] ??
                batch.codeConfig.charset
              }`}
            />
            <Item
              label="Thời hạn sử dụng"
              value={`${batch.durationValue} ${DURATION_LABEL[batch.durationUnit].toLowerCase()}`}
            />
            <Item
              label="Quota Email"
              value={formatNumber(quotaOf(batch.distributionChannels, "EMAIL"))}
            />
            <Item
              label="Quota Webhook"
              value={formatNumber(
                quotaOf(batch.distributionChannels, "WEBHOOK"),
              )}
            />
            <Item
              label="Đã sinh / Đã dùng"
              value={`${formatNumber(batch.generatedCount)} / ${formatNumber(batch.redeemedCount)}`}
            />
            <Item label="Tỉ lệ sử dụng" value={formatPercent(usedPct)} />
          </dl>
        )}
        {batch && (
          <p className="text-xs text-muted-foreground">
            Kênh phân phối: {DISTRIBUTION_LABEL.EMAIL} và{" "}
            {DISTRIBUTION_LABEL.WEBHOOK}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { quotaOf } from "@/lib/campaigns/format";
import type { VoucherBatchResponse } from "@/lib/campaigns/types";
import { formatNumber } from "@/lib/format";
import { AlertTriangle, Loader2, Rocket } from "lucide-react";

interface ActivateBatchDialogProps {
  batch: VoucherBatchResponse | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ActivateBatchDialog({
  batch,
  busy,
  onOpenChange,
  onConfirm,
}: ActivateBatchDialogProps) {
  // BE: lô BULK sinh một mã cho mỗi lượt quota, lô GENERIC sinh một mã dùng chung
  const usage = batch?.maxUsageCount ?? 0;

  return (
    <Dialog open={!!batch} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-amber-500/15 p-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>Kích hoạt tạo mã cho lô #{batch?.id}?</DialogTitle>
              <DialogDescription>
                Hệ thống sẽ sinh mã theo cấu hình hiện tại và công bố quy tắc
                liên quan. Sau khi kích hoạt, lô này không thể chỉnh sửa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {batch && (
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {batch.batchType === "BULK"
                ? "Số mã sẽ sinh:"
                : "Số lượt dùng tối đa:"}
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatNumber(usage)}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
            Kích hoạt tạo mã
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

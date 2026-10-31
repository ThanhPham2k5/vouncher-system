"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Campaign } from "@/lib/campaigns/types";
import { formatNumber } from "@/lib/format";

interface PauseCampaignDialogProps {
  campaign: Campaign | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notifyWebhook: boolean) => void;
}

// Đặt key theo id chiến dịch ở nơi gọi để reset checkbox mỗi lần mở
export function PauseCampaignDialog({
  campaign,
  busy,
  onOpenChange,
  onConfirm,
}: PauseCampaignDialogProps) {
  const [notifyWebhook, setNotifyWebhook] = useState(true);
  const issued =
    campaign?.batches.reduce((sum, b) => sum + b.generatedCount, 0) ?? 0;

  return (
    <Dialog
      open={!!campaign}
      onOpenChange={(open) => !busy && onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-amber-500/15 p-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>Tạm dừng chiến dịch: {campaign?.name}?</DialogTitle>
              <DialogDescription>
                Các mã voucher thuộc chiến dịch này sẽ tạm thời không thể áp
                dụng tại giỏ hàng. Bạn có thể kích hoạt lại bất kỳ lúc nào mà
                không làm mất thông tin điều kiện quy tắc.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Voucher bị ảnh hưởng:</span>
          <span className="font-mono font-semibold tabular-nums">
            {formatNumber(issued)} mã đã cấp
          </span>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted/60 p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={notifyWebhook}
            onChange={(e) => setNotifyWebhook(e.target.checked)}
          />
          <span>
            Gửi thông báo webhook cảnh báo tới các kênh đối tác & kênh phân phối
            liên kết
          </span>
        </label>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy bỏ
          </Button>
          <Button
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => onConfirm(notifyWebhook)}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Pause />}
            Xác nhận tạm dừng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

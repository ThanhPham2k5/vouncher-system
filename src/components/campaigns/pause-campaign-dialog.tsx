"use client";

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
import type { CampaignView } from "@/lib/campaigns/types";

interface PauseCampaignDialogProps {
  campaign: CampaignView | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PauseCampaignDialog({
  campaign,
  busy,
  onOpenChange,
  onConfirm,
}: PauseCampaignDialogProps) {
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
                dụng tại giỏ hàng. Bạn có thể kích hoạt lại bất kỳ lúc nào.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
            onClick={onConfirm}
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

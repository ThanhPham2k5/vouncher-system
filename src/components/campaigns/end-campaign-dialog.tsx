"use client";

import { AlertTriangle, Loader2, StopCircle } from "lucide-react";
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

interface EndCampaignDialogProps {
  campaign: CampaignView | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function EndCampaignDialog({
  campaign,
  busy,
  onOpenChange,
  onConfirm,
}: EndCampaignDialogProps) {
  return (
    <Dialog
      open={!!campaign}
      onOpenChange={(open) => !busy && onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-destructive/15 p-2.5 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>Kết thúc chiến dịch: {campaign?.name}?</DialogTitle>
              <DialogDescription>
                Chiến dịch sẽ kết thúc và không thể kích hoạt lại. Các mã
                voucher thuộc chiến dịch sẽ không còn áp dụng được tại giỏ hàng.
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
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <StopCircle />}
            Xác nhận kết thúc
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

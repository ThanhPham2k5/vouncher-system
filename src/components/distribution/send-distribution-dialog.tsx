"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDistributionLog } from "@/lib/api/distribution";
import {
  DISTRIBUTION_CHANNELS,
  type DistributionChannel,
  type DistributionLogResponse,
  type VoucherBatchResponse,
} from "@/lib/campaigns/be-types";
import { DISTRIBUTION_LABEL } from "@/lib/campaigns/format";
import { listVoucherBatches } from "@/lib/campaigns/service";
import type { CampaignView } from "@/lib/campaigns/types";

interface SendDistributionDialogProps {
  open: boolean;
  campaigns: CampaignView[];
  onOpenChange: (open: boolean) => void;
  onSent: (log: DistributionLogResponse) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Đặt key theo lần mở ở nơi gọi để form reset
export function SendDistributionDialog({
  open,
  campaigns,
  onOpenChange,
  onSent,
}: SendDistributionDialogProps) {
  const [campaignId, setCampaignId] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [channel, setChannel] = useState<DistributionChannel>("EMAIL");
  const [target, setTarget] = useState("");
  const [batches, setBatches] = useState<VoucherBatchResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setBatches([]);
      return;
    }
    let active = true;
    listVoucherBatches(Number(campaignId)).then((list) => {
      if (active) setBatches(list);
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  function validate(): string | null {
    if (!campaignId) return "Chọn chiến dịch";
    if (!batchId) return "Chọn lô mã";
    const t = target.trim();
    if (!t) return "Nhập địa chỉ nhận";
    if (channel === "EMAIL" && !EMAIL_PATTERN.test(t))
      return "Địa chỉ email không hợp lệ";
    if (channel === "WEBHOOK" && !t.startsWith("https://")) {
      return "Webhook URL phải bắt đầu bằng https://";
    }
    return null;
  }

  async function handleSend() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const log = await createDistributionLog({
        batchId: Number(batchId),
        campaignId: Number(campaignId),
        channel,
        targetAddress: target.trim(),
      });
      toast.success("Đã ghi nhận yêu cầu gửi mã", {
        description: "Trạng thái sẽ cập nhật khi gửi xong.",
      });
      onSent(log);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không gửi được, vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gửi mã giảm giá</DialogTitle>
          <DialogDescription>
            Chọn lô mã, kênh và địa chỉ nhận. Mỗi lần gửi tạo một bản ghi nhật
            ký.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dist-campaign">Chiến dịch</Label>
            <SearchableSelect
              id="dist-campaign"
              value={campaignId}
              onValueChange={(v) => {
                setCampaignId(v);
                setBatchId("");
              }}
              placeholder="Chọn chiến dịch"
              searchPlaceholder="Tìm chiến dịch..."
              options={campaigns.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dist-batch">Lô mã</Label>
            <SearchableSelect
              id="dist-batch"
              value={batchId}
              onValueChange={setBatchId}
              disabled={!campaignId}
              placeholder={campaignId ? "Chọn lô mã" : "Chọn chiến dịch trước"}
              searchPlaceholder="Tìm lô..."
              emptyText="Chiến dịch này chưa có lô mã"
              options={batches.map((b) => ({
                value: String(b.id),
                label: `Lô #${b.id} · đã cấp ${b.generatedCount}`,
              }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dist-channel">Kênh</Label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as DistributionChannel)}
              >
                <SelectTrigger id="dist-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTRIBUTION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {DISTRIBUTION_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dist-target">
                {channel === "EMAIL" ? "Email nhận" : "Webhook URL"}
              </Label>
              <Input
                id="dist-target"
                value={target}
                placeholder={
                  channel === "EMAIL" ? "khach@example.com" : "https://..."
                }
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy bỏ
          </Button>
          <Button onClick={handleSend} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
            Gửi mã
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

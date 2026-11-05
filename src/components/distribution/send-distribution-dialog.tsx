"use client";

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
import { DISTRIBUTION_LABEL, quotaOf } from "@/lib/campaigns/format";
import {
  MOCK_EMAIL_TARGETS,
  MOCK_WEBHOOK_TARGETS,
} from "@/lib/campaigns/mock-data";
import { listVoucherBatches } from "@/lib/campaigns/service";
import type { CampaignView } from "@/lib/campaigns/types";
import { Layers, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SendDistributionDialogProps {
  open: boolean;
  campaigns: CampaignView[];
  onOpenChange: (open: boolean) => void;
  onSent: (log: DistributionLogResponse) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Channel Quota Exceeded")) {
    return "Đã vượt quá số lần gửi cho phép";
  }
  return message || "Không gửi được, vui lòng thử lại.";
}

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
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  // Gửi hàng loạt: số địa chỉ = min(quota của kênh, số địa chỉ mẫu).
  // Duyệt danh sách mẫu từ đầu, gửi lần lượt từng địa chỉ. Bỏ qua ô nhập địa chỉ thủ công.
  async function handleBulkSend() {
    if (!campaignId) {
      setError("Chọn chiến dịch");
      return;
    }
    if (!batchId) {
      setError("Chọn lô mã");
      return;
    }
    const batch = batches.find((b) => String(b.id) === batchId);
    if (!batch) {
      setError("Lô mã không hợp lệ");
      return;
    }

    const quota = quotaOf(batch.distributionChannels, channel);
    const targets =
      channel === "EMAIL" ? MOCK_EMAIL_TARGETS : MOCK_WEBHOOK_TARGETS;
    const count = Math.min(quota, targets.length);
    if (count <= 0) {
      setError(`Kênh ${DISTRIBUTION_LABEL[channel]} của lô này chưa có quota`);
      return;
    }

    setError(null);
    setBusy(true);
    let sent = 0;
    const failures: string[] = [];
    // Gửi tuần tự để không vượt quota và không tranh chấp với BE
    for (let i = 0; i < count; i++) {
      const address = targets[i];
      try {
        const log = await createDistributionLog({
          batchId: Number(batchId),
          campaignId: Number(campaignId),
          channel,
          targetAddress: address,
        });
        sent += 1;
        onSent(log);
      } catch (err) {
        failures.push(describeError(err));
      }
    }
    setBusy(false);

    if (failures.length === 0) {
      toast.success(`Đã gửi ${sent} mã qua ${DISTRIBUTION_LABEL[channel]}`);
      onOpenChange(false);
    } else {
      setError(`${failures[0]}`);
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
                label: `Lô #${b.id} - có ${b.generatedCount} mã`,
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

        <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="text-muted-foreground"
          >
            Hủy bỏ
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={handleBulkSend}
              disabled={busy}
              className="w-full border-primary/40 text-primary hover:bg-primary/5 sm:w-auto"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Layers />}
              Gửi hàng loạt
            </Button>
            <Button
              onClick={handleSend}
              disabled={busy}
              className="w-full shadow-sm sm:w-auto"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              Gửi mã
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

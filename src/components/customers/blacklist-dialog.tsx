"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBlacklist } from "@/lib/api/fraud";
import {
  BLACKLIST_TYPES,
  type BlackListResponse,
  type BlacklistType,
} from "@/lib/campaigns/be-types";
import { BLACKLIST_TYPE_LABEL } from "./security-meta";

export interface BlacklistPrefill {
  type: BlacklistType;
  value: string;
  reason?: string;
}

interface BlacklistDialogProps {
  open: boolean;
  prefill: BlacklistPrefill | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: BlackListResponse) => void;
}

// "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00" (BE dùng LocalDateTime)
function toBeDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

// Đặt key theo lần mở ở nơi gọi để form reset
export function BlacklistDialog({
  open,
  prefill,
  onOpenChange,
  onCreated,
}: BlacklistDialogProps) {
  const [type, setType] = useState<BlacklistType>(prefill?.type ?? "CUSTOMER");
  const [value, setValue] = useState(prefill?.value ?? "");
  const [reason, setReason] = useState(prefill?.reason ?? "");
  const [expiredAt, setExpiredAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (!value.trim()) return "Nhập giá trị cần chặn";
    if (value.trim().length > 255) return "Giá trị tối đa 255 ký tự";
    if (!reason.trim()) return "Nhập lý do";
    if (reason.trim().length > 255) return "Lý do tối đa 255 ký tự";
    if (expiredAt && Date.parse(expiredAt) <= Date.now()) {
      return "Thời điểm hết hạn phải nằm trong tương lai";
    }
    return null;
  }

  async function handleSubmit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const created = await createBlacklist({
        blacklistType: type,
        targetValue: value.trim(),
        reason: reason.trim(),
        expiredAt: expiredAt ? toBeDateTime(expiredAt) : null,
      });
      toast.success("Đã thêm vào danh sách đen");
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thêm được, thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm vào danh sách đen</DialogTitle>
          <DialogDescription>
            Khách hàng, thiết bị hoặc IP bị chặn sẽ không áp dụng được mã giảm
            giá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bl-type">Loại đối tượng</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as BlacklistType)}
              >
                <SelectTrigger id="bl-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLACKLIST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {BLACKLIST_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bl-value">Giá trị</Label>
              <Input
                id="bl-value"
                value={value}
                placeholder={
                  type === "IP"
                    ? "113.161.45.19"
                    : type === "CUSTOMER"
                      ? "ID khách hàng"
                      : "fp_abc123"
                }
                onChange={(e) => setValue(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bl-reason">Lý do</Label>
            <Input
              id="bl-reason"
              value={reason}
              placeholder="Gian lận mã giảm giá hàng loạt"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bl-expired">
              Hết hạn chặn (để trống = vĩnh viễn)
            </Label>
            <Input
              id="bl-expired"
              type="datetime-local"
              value={expiredAt}
              onChange={(e) => setExpiredAt(e.target.value)}
            />
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
          <Button variant="destructive" onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Ban />}
            Chặn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

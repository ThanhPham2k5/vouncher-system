"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
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
import { updateBlacklist } from "@/lib/api/fraud";
import {
  BLACKLIST_TYPES,
  type BlackListResponse,
  type BlacklistType,
} from "@/lib/campaigns/be-types";
import { BLACKLIST_TYPE_LABEL } from "./security-meta";

// BE: "YYYY-MM-DDTHH:mm:ss" -> input datetime-local "YYYY-MM-DDTHH:mm"
function toInputValue(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

// input "YYYY-MM-DDTHH:mm" -> BE "YYYY-MM-DDTHH:mm:00"
function toBeDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

interface BlacklistEditDialogProps {
  item: BlackListResponse | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: BlackListResponse) => void;
}

// Đặt key theo id bản ghi ở nơi gọi để form reset mỗi lần mở
export function BlacklistEditDialog({
  item,
  onOpenChange,
  onSaved,
}: BlacklistEditDialogProps) {
  const [type, setType] = useState<BlacklistType>(item?.type ?? "CUSTOMER");
  const [value, setValue] = useState(item?.value ?? "");
  const [reason, setReason] = useState(item?.reason ?? "");
  const [expiredAt, setExpiredAt] = useState(
    toInputValue(item?.expiredAt ?? null),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!item) return;
    const v = value.trim();
    const r = reason.trim();
    if (!v) {
      setError("Nhập giá trị");
      return;
    }
    if (!r) {
      setError("Nhập lý do");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await updateBlacklist(item.id, {
        blacklistType: type,
        targetValue: v,
        reason: r,
        expiredAt: expiredAt ? toBeDateTime(expiredAt) : null,
      });
      onSaved(updated);
      toast.success("Đã cập nhật danh sách đen");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không cập nhật được, thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa danh sách đen #{item?.id}</DialogTitle>
          <DialogDescription>
            Để trống thời hạn để bản ghi có hiệu lực vĩnh viễn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bl-edit-type">Loại</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as BlacklistType)}
              >
                <SelectTrigger id="bl-edit-type">
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
              <Label htmlFor="bl-edit-value">Giá trị</Label>
              <Input
                id="bl-edit-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bl-edit-reason">Lý do</Label>
            <Input
              id="bl-edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bl-edit-expired">Hết hạn</Label>
            <Input
              id="bl-edit-expired"
              type="datetime-local"
              value={expiredAt}
              onChange={(e) => setExpiredAt(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBatchRule, updateBatchRule } from "@/lib/api/rule-engine";
import type {
  BatchRuleResponse,
  ConditionResponse,
  RewardResponse,
} from "@/lib/campaigns/be-types";
import { Loader2, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

interface BatchRuleDialogProps {
  open: boolean;
  item: BatchRuleResponse | null; // null = thêm mới
  rewards: RewardResponse[];
  conditions: ConditionResponse[];
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: BatchRuleResponse) => void;
}

const BATCH_RULE_ERRORS: Record<string, string> = {
  "Cannot update a rule that is currently in use by a generated voucher batch.":
    "Quy tắc đang được dùng bởi lô mã đã sinh mã, không thể chỉnh sửa.",
  "A batch rule with this reward and condition already exists.":
    "Đã tồn tại quy tắc lô mã với phần thưởng và điều kiện này.",
};

function translateBatchRuleError(message: string): string {
  return BATCH_RULE_ERRORS[message] ?? message;
}

// Đặt key theo lần mở ở nơi gọi để form reset
export function BatchRuleDialog({
  open,
  item,
  rewards,
  conditions,
  onOpenChange,
  onSaved,
}: BatchRuleDialogProps) {
  const [rewardId, setRewardId] = useState(item ? String(item.rewardId) : "");
  const [conditionId, setConditionId] = useState(
    item ? String(item.conditionId) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!rewardId) {
      setError("Chọn phần thưởng");
      return;
    }
    if (!conditionId) {
      setError("Chọn điều kiện");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body = {
        rewardId: Number(rewardId),
        conditionId: Number(conditionId),
      };
      const saved = item
        ? await updateBatchRule(item.id, body)
        : await createBatchRule(body);
      toast.success(
        item
          ? `Đã cập nhật quy tắc lô #${saved.id}`
          : `Đã tạo quy tắc lô #${saved.id}`,
      );
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? translateBatchRuleError(err.message)
          : "Không lưu được quy tắc, vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? `Sửa quy tắc lô #${item.id}` : "Thêm quy tắc lô mã"}
          </DialogTitle>
          <DialogDescription>
            Ghép một phần thưởng với một điều kiện. Lô mã sẽ dùng quy tắc này.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>Phần thưởng</Label>
            <Select value={rewardId} onValueChange={setRewardId}>
              <SelectTrigger aria-label="Chọn phần thưởng">
                <SelectValue placeholder="Chọn phần thưởng" />
              </SelectTrigger>
              <SelectContent>
                {rewards.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Điều kiện</Label>
            <Select value={conditionId} onValueChange={setConditionId}>
              <SelectTrigger aria-label="Chọn điều kiện">
                <SelectValue placeholder="Chọn điều kiện" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />}
              {item ? "Lưu thay đổi" : "Tạo quy tắc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

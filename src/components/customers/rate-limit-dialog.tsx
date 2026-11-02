"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
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
import {
  createRateLimitConfig,
  updateRateLimitConfig,
} from "@/lib/api/rate-limit";
import {
  ACTION_ON_EXCEED,
  LIMIT_SCOPES,
  type ActionOnExceed,
  type LimitScope,
  type RateLimitConfigResponse,
} from "@/lib/campaigns/be-types";
import { ACTION_LABEL, LIMIT_SCOPE_LABEL } from "./security-meta";

interface RateLimitDialogProps {
  open: boolean;
  // null = tạo mới
  editing: RateLimitConfigResponse | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: RateLimitConfigResponse) => void;
}

function parsePositiveInt(text: string): number | null {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// Đặt key theo lần mở ở nơi gọi để form reset
export function RateLimitDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: RateLimitDialogProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [endpointPattern, setEndpointPattern] = useState(
    editing?.endpointPattern ?? "",
  );
  const [scope, setScope] = useState<LimitScope>(
    editing?.scope ?? "CUSTOMER_ID",
  );
  const [maxRequest, setMaxRequest] = useState(
    String(editing?.maxRequest ?? 5),
  );
  const [windowSeconds, setWindowSeconds] = useState(
    String(editing?.timeWindowSeconds ?? 60),
  );
  const [action, setAction] = useState<ActionOnExceed>(
    editing?.actionOnExceed ?? "REJECT_429",
  );
  const [priority, setPriority] = useState(String(editing?.priority ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const max = parsePositiveInt(maxRequest);
    const win = parsePositiveInt(windowSeconds);
    const prio = Number(priority);
    if (!name.trim()) return setError("Nhập tên cấu hình");
    if (!endpointPattern.trim()) return setError("Nhập endpoint áp dụng");
    if (max === null) return setError("Số request tối đa phải từ 1 trở lên");
    if (win === null) return setError("Khung thời gian phải từ 1 giây trở lên");
    if (!Number.isInteger(prio))
      return setError("Độ ưu tiên phải là số nguyên");

    setError(null);
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        endpointPattern: endpointPattern.trim(),
        limitScope: scope,
        maxRequest: max,
        timeWindowSeconds: win,
        actionOnExceed: action,
        priority: prio,
      };
      const saved = editing
        ? await updateRateLimitConfig(editing.id, body)
        : await createRateLimitConfig(body);
      toast.success(editing ? "Đã cập nhật cấu hình" : "Đã tạo cấu hình");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không lưu được, thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Sửa cấu hình #${editing.id}`
              : "Tạo cấu hình rate limit"}
          </DialogTitle>
          <DialogDescription>
            Giới hạn số request trên từng endpoint theo khách hàng, thiết bị
            hoặc IP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rl-name">Tên cấu hình</Label>
            <Input
              id="rl-name"
              value={name}
              placeholder="Giới hạn đổi mã theo khách hàng"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rl-endpoint">Endpoint</Label>
            <Input
              id="rl-endpoint"
              value={endpointPattern}
              placeholder="/redemptions"
              onChange={(e) => setEndpointPattern(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rl-scope">Phạm vi giới hạn</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as LimitScope)}
              >
                <SelectTrigger id="rl-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LIMIT_SCOPE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl-action">Khi vượt ngưỡng</Label>
              <Select
                value={action}
                onValueChange={(v) => setAction(v as ActionOnExceed)}
              >
                <SelectTrigger id="rl-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_ON_EXCEED.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rl-max">Số request tối đa</Label>
              <Input
                id="rl-max"
                type="number"
                min={1}
                value={maxRequest}
                onChange={(e) => setMaxRequest(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl-window">Khung thời gian (giây)</Label>
              <Input
                id="rl-window"
                type="number"
                min={1}
                value={windowSeconds}
                onChange={(e) => setWindowSeconds(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl-priority">Độ ưu tiên</Label>
              <Input
                id="rl-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
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
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

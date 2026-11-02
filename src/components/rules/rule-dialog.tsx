"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createCondition,
  createReward,
  updateCondition,
  updateReward,
} from "@/lib/api/rule-engine";
import type {
  ConditionResponse,
  RewardResponse,
  RuleMetadataResponse,
} from "@/lib/campaigns/be-types";
import {
  buildConfig,
  defaultType,
  emptyForm,
  formFromItem,
  layoutFor,
  validateName,
  type FieldDef,
  type RuleForm,
  type RuleKind,
} from "./rule-config";

interface RuleDialogProps {
  open: boolean;
  kind: RuleKind;
  metadata: RuleMetadataResponse | null;
  item: RewardResponse | ConditionResponse | null; // null = tạo mới
  onOpenChange: (open: boolean) => void;
  onSaved: (item: RewardResponse | ConditionResponse) => void;
}

// Đặt key theo kind + id ở nơi gọi để form reset mỗi lần mở
export function RuleDialog({
  open,
  kind,
  metadata,
  item,
  onOpenChange,
  onSaved,
}: RuleDialogProps) {
  const isEdit = item !== null;
  const [form, setForm] = useState<RuleForm>(() =>
    item ? formFromItem(kind, item) : emptyForm(kind, defaultType(kind)),
  );
  const [errors, setErrors] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typeOptions =
    (kind === "REWARD" ? metadata?.rewardTypes : metadata?.conditionTypes) ??
    [];
  const layout = layoutFor(kind, form.type);

  function patchField(key: string, value: string) {
    setForm((f) => ({ ...f, fields: { ...f.fields, [key]: value } }));
  }

  function patchRow(
    index: number,
    rowIndex: number,
    key: string,
    value: string,
  ) {
    setForm((f) => ({
      ...f,
      rows: f.rows.map((rows, i) =>
        i === index
          ? rows.map((r, j) => (j === rowIndex ? { ...r, [key]: value } : r))
          : rows,
      ),
    }));
  }

  function changeType(nextType: string) {
    // Đổi loại làm mất các trường cũ, giữ tên
    setForm((f) => ({ ...emptyForm(kind, nextType), name: f.name }));
    setErrors(null);
  }

  function renderField(def: FieldDef) {
    const id = `rule-${kind}-${def.key}`;
    const value = form.fields[def.key] ?? "";
    return (
      <div key={def.key} className="space-y-1.5">
        <Label htmlFor={id}>{def.label}</Label>
        {def.kind === "select" ? (
          <Select value={value} onValueChange={(v) => patchField(def.key, v)}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : def.kind === "json" ? (
          <Textarea
            id={id}
            rows={5}
            className="font-mono text-xs"
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => patchField(def.key, e.target.value)}
          />
        ) : (
          <Input
            id={id}
            inputMode={def.kind === "number" ? "decimal" : "text"}
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => patchField(def.key, e.target.value)}
          />
        )}
        {def.hint ? (
          <p className="text-xs text-muted-foreground">{def.hint}</p>
        ) : null}
      </div>
    );
  }

  async function handleSave() {
    const nameError = validateName(form.name);
    if (nameError) {
      setErrors(nameError);
      return;
    }
    const built = buildConfig(kind, form);
    if ("error" in built) {
      setErrors(built.error);
      return;
    }
    setErrors(null);
    setBusy(true);
    try {
      const name = form.name.trim();
      let saved: RewardResponse | ConditionResponse;
      if (kind === "REWARD") {
        saved = isEdit
          ? await updateReward(item.id, { name, config: built.config })
          : await createReward({
              name,
              rewardType: form.type as RewardResponse["rewardType"],
              config: built.config,
            });
      } else {
        saved = isEdit
          ? await updateCondition(item.id, { name, config: built.config })
          : await createCondition({
              name,
              conditionType: form.type as ConditionResponse["conditionType"],
              config: built.config,
            });
      }
      toast.success(isEdit ? "Đã lưu cấu hình" : "Đã tạo cấu hình", {
        description: saved.name,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error("Không lưu được cấu hình", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setBusy(false);
    }
  }

  const title =
    kind === "REWARD"
      ? isEdit
        ? "Sửa phần thưởng"
        : "Thêm phần thưởng"
      : isEdit
        ? "Sửa điều kiện"
        : "Thêm điều kiện";

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Điền đầy đủ các trường trước khi lưu. Cấu hình được kiểm tra theo
            đúng quy định của hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Tên cấu hình</Label>
            <Input
              id="rule-name"
              value={form.name}
              placeholder={
                kind === "REWARD"
                  ? "VD: Giảm 20% phụ kiện"
                  : "VD: Đơn từ 1.5 triệu"
              }
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-type">Loại</Label>
            <Select
              value={form.type}
              onValueChange={changeType}
              disabled={isEdit}
            >
              <SelectTrigger id="rule-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                Không đổi loại sau khi tạo. Muốn đổi loại hãy tạo cấu hình mới.
              </p>
            ) : null}
          </div>

          {layout.fields.map(renderField)}

          {(layout.rows ?? []).map((def, index) => (
            <div key={def.key} className="space-y-2">
              <p className="text-sm font-medium">{def.label}</p>
              {(form.rows[index] ?? []).map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                >
                  {def.columns.map((col) => (
                    <div key={col.key} className="space-y-1">
                      <Label
                        className="text-xs"
                        htmlFor={`rule-${def.key}-${rowIndex}-${col.key}`}
                      >
                        {col.label}
                      </Label>
                      <Input
                        id={`rule-${def.key}-${rowIndex}-${col.key}`}
                        value={row[col.key] ?? ""}
                        placeholder={col.placeholder}
                        onChange={(e) =>
                          patchRow(index, rowIndex, col.key, e.target.value)
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Xóa dòng"
                    disabled={(form.rows[index] ?? []).length <= 1}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        rows: f.rows.map((rows, i) =>
                          i === index
                            ? rows.filter((_, j) => j !== rowIndex)
                            : rows,
                        ),
                      }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    rows: f.rows.map((rows, i) =>
                      i === index
                        ? [
                            ...rows,
                            Object.fromEntries(
                              def.columns.map((c) => [c.key, ""]),
                            ),
                          ]
                        : rows,
                    ),
                  }))
                }
              >
                <Plus />
                {def.addLabel}
              </Button>
            </div>
          ))}

          {errors ? (
            <p role="alert" className="text-sm text-destructive">
              {errors}
            </p>
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
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Lưu cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

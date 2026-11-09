"use client";

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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OptionMultiSelect } from "./option-multi-select";
import {
  buildConfig,
  defaultType,
  emptyForm,
  formFromItem,
  layoutFor,
  SUB_CONDITION_TYPES,
  validateName,
  type FieldDef,
  type RowDef,
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

  function changeType(nextType: string) {
    // Đổi loại làm mất các trường cũ, giữ tên
    setForm((f) => ({ ...emptyForm(kind, nextType), name: f.name }));
    setErrors(null);
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
          ? await updateReward(item.id, {
              name,
              rewardType: form.type as RewardResponse["rewardType"],
              config: built.config,
            })
          : await createReward({
              name,
              rewardType: form.type as RewardResponse["rewardType"],
              config: built.config,
            });
      } else {
        saved = isEdit
          ? await updateCondition(item.id, {
              name,
              conditionType: form.type as ConditionResponse["conditionType"],
              config: built.config,
            })
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
            <Select value={form.type} onValueChange={changeType}>
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
          </div>

          <FormBody
            kind={kind}
            form={form}
            idPrefix={`rule-${kind}`}
            metadata={metadata}
            onChange={setForm}
          />

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

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface FormBodyProps {
  kind: RuleKind;
  form: RuleForm;
  idPrefix: string;
  metadata: RuleMetadataResponse | null;
  onChange: (next: RuleForm) => void;
}

// Các trường theo loại (dùng lại cho điều kiện con)
function FormBody({ kind, form, idPrefix, metadata, onChange }: FormBodyProps) {
  const layout = layoutFor(kind, form.type);
  const set = (patch: Partial<RuleForm>) => onChange({ ...form, ...patch });

  function setField(key: string, value: string) {
    set({ fields: { ...form.fields, [key]: value } });
  }

  function setRow(index: number, rowIndex: number, key: string, value: string) {
    set({
      rows: form.rows.map((rows, i) =>
        i === index
          ? rows.map((r, j) => (j === rowIndex ? { ...r, [key]: value } : r))
          : rows,
      ),
    });
  }

  function renderField(def: FieldDef) {
    if (def.kind === "conditions") {
      return (
        <SubConditionsEditor
          key={def.key}
          label={def.label}
          hint={def.hint}
          subs={form.subs}
          idPrefix={`${idPrefix}-sub`}
          metadata={metadata}
          onChange={(subs) => set({ subs })}
        />
      );
    }
    const id = `${idPrefix}-${def.key}`;
    const value = form.fields[def.key] ?? "";
    return (
      <div key={def.key} className="space-y-1.5">
        <Label htmlFor={id}>{def.label}</Label>
        {def.kind === "select" ? (
          <Select value={value} onValueChange={(v) => setField(def.key, v)}>
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
        ) : def.kind === "multi" ? (
          <OptionMultiSelect
            id={id}
            value={splitList(value)}
            options={def.options ?? []}
            onChange={(next) => setField(def.key, next.join(", "))}
          />
        ) : (
          <Input
            id={id}
            inputMode={def.kind === "number" ? "decimal" : "text"}
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => setField(def.key, e.target.value)}
          />
        )}
        {def.hint ? (
          <p className="text-xs text-muted-foreground">{def.hint}</p>
        ) : null}
      </div>
    );
  }

  function renderRows(def: RowDef, index: number) {
    const rows = form.rows[index] ?? [];
    return (
      <div key={def.key} className="space-y-2">
        <p className="text-sm font-medium">{def.label}</p>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-end gap-2 rounded-lg border bg-muted/40 p-3"
            style={{
              gridTemplateColumns: `repeat(${def.columns.length}, minmax(0, 1fr)) auto`,
            }}
          >
            {def.columns.map((col) => (
              <div key={col.key} className="space-y-1">
                <Label
                  className="text-xs"
                  htmlFor={`${idPrefix}-${def.key}-${rowIndex}-${col.key}`}
                >
                  {col.label}
                </Label>
                <Input
                  id={`${idPrefix}-${def.key}-${rowIndex}-${col.key}`}
                  value={row[col.key] ?? ""}
                  placeholder={col.placeholder}
                  onChange={(e) =>
                    setRow(index, rowIndex, col.key, e.target.value)
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa dòng"
              disabled={rows.length <= 1}
              onClick={() =>
                set({
                  rows: form.rows.map((list, i) =>
                    i === index ? list.filter((_, j) => j !== rowIndex) : list,
                  ),
                })
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
            set({
              rows: form.rows.map((list, i) =>
                i === index
                  ? [
                      ...list,
                      Object.fromEntries(def.columns.map((c) => [c.key, ""])),
                    ]
                  : list,
              ),
            })
          }
        >
          <Plus />
          {def.addLabel}
        </Button>
      </div>
    );
  }

  return (
    <>
      {layout.fields.map(renderField)}
      {(layout.rows ?? []).map((def, index) => renderRows(def, index))}
    </>
  );
}

interface SubConditionsEditorProps {
  label: string;
  hint?: string;
  subs: RuleForm[];
  idPrefix: string;
  metadata: RuleMetadataResponse | null;
  onChange: (subs: RuleForm[]) => void;
}

// Danh sách điều kiện con: mỗi dòng chọn loại rồi nhập như một điều kiện đơn
function SubConditionsEditor({
  label,
  hint,
  subs,
  idPrefix,
  metadata,
  onChange,
}: SubConditionsEditorProps) {
  const labelOf = (type: string) =>
    metadata?.conditionTypes.find((t) => t.type === type)?.label ?? type;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {subs.map((sub, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-muted/40 p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`${idPrefix}${i}-type`}>
                Loại điều kiện {i + 1}
              </Label>
              <Select
                value={sub.type}
                onValueChange={(type) =>
                  onChange(
                    subs.map((s, j) =>
                      j === i ? emptyForm("CONDITION", type) : s,
                    ),
                  )
                }
              >
                <SelectTrigger id={`${idPrefix}${i}-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_CONDITION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelOf(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa điều kiện ${i + 1}`}
              disabled={subs.length <= 1}
              onClick={() => onChange(subs.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
          <FormBody
            kind="CONDITION"
            form={sub}
            idPrefix={`${idPrefix}${i}`}
            metadata={metadata}
            onChange={(next) =>
              onChange(subs.map((s, j) => (j === i ? next : s)))
            }
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...subs, emptyForm("CONDITION", "MIN_CART_AMOUNT")])
        }
      >
        <Plus />
        Thêm điều kiện con
      </Button>
    </div>
  );
}

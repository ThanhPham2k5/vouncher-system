"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BATCH_TYPE_LABEL,
  CHARSET_LABEL,
  DURATION_LABEL,
  toInputDateTime,
} from "@/lib/campaigns/format";
import {
  createCampaign,
  getCampaign,
  listRules,
  updateCampaign,
} from "@/lib/campaigns/service";
import type {
  BatchRuleOption,
  BatchType,
  Campaign,
  CampaignStatus,
  CampaignInput,
  CharsetType,
  DurationUnit,
  VoucherBatchInput,
} from "@/lib/campaigns/types";
import { validateCampaign, type FormErrors } from "@/lib/campaigns/validation";
import { formatNumber, formatVnd } from "@/lib/format";

interface CampaignFormProps {
  mode: "create" | "edit";
  campaignId?: string;
}

function emptyBatch(): VoucherBatchInput {
  return {
    batchType: "GENERIC",
    ruleId: "",
    prefix: "",
    length: 8,
    charset: "ALPHANUMERIC",
    durationValue: 14,
    durationUnit: "DAYS",
    quotaEmail: 0,
    quotaWebhook: 0,
  };
}

const BLANK_INPUT: CampaignInput = {
  id: "",
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  budgetTotal: 0,
  budgetThreshold: 0,
  batches: [emptyBatch()],
};

function generateCampaignId(): string {
  return `CAMP_${new Date().getFullYear()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function toLocalInput(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

// Chỉ chạy ở phía client để tránh lệch hydration
function defaultInput(): CampaignInput {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    ...BLANK_INPUT,
    id: generateCampaignId(),
    startTime: toLocalInput(now),
    endTime: toLocalInput(end),
    budgetTotal: 100_000_000,
    budgetThreshold: 80_000_000,
  };
}

function toInput(c: Campaign): CampaignInput {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    startTime: toInputDateTime(c.startTime),
    endTime: toInputDateTime(c.endTime),
    budgetTotal: c.budgetTotal,
    budgetThreshold: c.budgetThreshold,
    batches: c.batches.map(
      ({ generatedCount: _g, redeemedCount: _r, ...rest }) => rest,
    ),
  };
}

export function CampaignForm({ mode, campaignId }: CampaignFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<CampaignInput>(BLANK_INPUT);
  const [rules, setRules] = useState<BatchRuleOption[]>([]);
  const [status, setStatus] = useState<CampaignStatus>("ACTIVE");
  const [loading, setLoading] = useState(isEdit);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listRules()
      .then(setRules)
      .catch(() => toast.error("Không tải được danh sách quy tắc"));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setForm(defaultInput());
      return;
    }
    if (!campaignId) return;

    let active = true;
    setLoading(true);
    getCampaign(campaignId)
      .then((c) => {
        if (!active) return;
        if (!c) {
          setLoadFailed(true);
          return;
        }
        setForm(toInput(c));
        setStatus(c.status);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, campaignId]);

  function setField<K extends keyof CampaignInput>(
    key: K,
    value: CampaignInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setBatch(index: number, patch: Partial<VoucherBatchInput>) {
    setForm((f) => ({
      ...f,
      batches: f.batches.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function addBatch() {
    setForm((f) => ({ ...f, batches: [...f.batches, emptyBatch()] }));
  }

  function removeBatch(index: number) {
    setForm((f) => ({
      ...f,
      batches: f.batches.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const found = validateCampaign(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", {
        description: "Một số trường còn thiếu hoặc không hợp lệ.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateCampaign(form.id, form)
        : await createCampaign(form);
      toast.success(isEdit ? "Đã lưu thay đổi" : "Tạo chiến dịch thành công", {
        description: `${saved.name} · ${saved.batches.length} lô mã`,
      });
      router.push(`/admin/campaigns/${saved.id}`);
    } catch (err) {
      toast.error("Không lưu được chiến dịch", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[520px] lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <p className="font-semibold">Không tải được chiến dịch</p>
          <Button asChild variant="outline">
            <Link href="/admin/campaigns">
              <ArrowLeft />
              Quay lại danh sách
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const errorCount = Object.keys(errors).length;
  const totalQuota = form.batches.reduce(
    (sum, b) => sum + b.quotaEmail + b.quotaWebhook,
    0,
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link
            href={
              isEdit && campaignId
                ? `/admin/campaigns/${campaignId}`
                : "/admin/campaigns"
            }
          >
            <ArrowLeft />
            Quay lại
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch khuyến mãi mới"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Thiết lập thông tin chung, ngân sách trần và danh sách lô mã áp dụng.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                1. Thông tin chung & thời gian
              </CardTitle>
              <CardDescription>
                Định danh, phạm vi thời gian và ngưỡng cảnh báo chi tiêu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field
                label="Mã định danh chiến dịch (Campaign ID)"
                error={errors.id}
                hint={
                  isEdit
                    ? "Không thể thay đổi sau khi tạo."
                    : "Duy nhất trên toàn hệ thống, không đổi sau khi kích hoạt."
                }
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={form.id}
                    disabled={isEdit}
                    onChange={(e) =>
                      setField("id", e.target.value.toUpperCase())
                    }
                    className="font-mono"
                    aria-invalid={!!errors.id}
                  />
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setField("id", generateCampaignId())}
                    >
                      <RefreshCw />
                      Tạo ngẫu nhiên
                    </Button>
                  )}
                </div>
              </Field>

              <Field label="Tên chiến dịch" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="ví dụ: Đại tiệc Mua Sắm 11.11"
                  aria-invalid={!!errors.name}
                />
              </Field>

              <Field label="Mô tả chiến dịch" error={errors.description}>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Mục tiêu và đối tượng áp dụng"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Thời gian bắt đầu" error={errors.startTime}>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setField("startTime", e.target.value)}
                    aria-invalid={!!errors.startTime}
                  />
                </Field>
                <Field label="Thời gian kết thúc" error={errors.endTime}>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setField("endTime", e.target.value)}
                    aria-invalid={!!errors.endTime}
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Tổng ngân sách cấp (VND)"
                  error={errors.budgetTotal}
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.budgetTotal}
                    onChange={(e) =>
                      setField("budgetTotal", Number(e.target.value))
                    }
                    aria-invalid={!!errors.budgetTotal}
                  />
                </Field>
                <Field
                  label="Ngưỡng cảnh báo chi tiêu (VND)"
                  error={errors.budgetThreshold}
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.budgetThreshold}
                    onChange={(e) =>
                      setField("budgetThreshold", Number(e.target.value))
                    }
                    aria-invalid={!!errors.budgetThreshold}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">
                  2. Cấu hình lô mã (Voucher batches)
                </CardTitle>
                <CardDescription>
                  Mỗi lô gắn với đúng một quy tắc áp dụng
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBatch}
              >
                <Plus />
                Thêm lô mã
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.batches && (
                <p className="text-sm text-destructive">{errors.batches}</p>
              )}
              {form.batches.map((batch, index) => (
                <BatchEditor
                  key={index}
                  index={index}
                  batch={batch}
                  rules={rules}
                  errors={errors}
                  canRemove={form.batches.length > 1}
                  onChange={(patch) => setBatch(index, patch)}
                  onRemove={() => removeBatch(index)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tóm tắt chiến dịch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <SummaryRow label="Trạng thái khi lưu">
                <CampaignStatusBadge status={isEdit ? status : "ACTIVE"} />
              </SummaryRow>
              <SummaryRow label="Số lô mã">{form.batches.length} lô</SummaryRow>
              <SummaryRow label="Tổng quota kênh">
                {formatNumber(totalQuota)} mã
              </SummaryRow>
              <SummaryRow label="Ngân sách cấp">
                {formatVnd(form.budgetTotal || 0)}
              </SummaryRow>
              <SummaryRow label="Ngưỡng cảnh báo">
                {formatVnd(form.budgetThreshold || 0)}
              </SummaryRow>

              {errorCount > 0 && (
                <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                  Còn {errorCount} lỗi cần sửa trước khi lưu.
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <Loader2 className="animate-spin" />
                  ) : isEdit ? (
                    <Save />
                  ) : (
                    <Rocket />
                  )}
                  {isEdit ? "Lưu thay đổi" : "Khởi tạo chiến dịch & sinh lô mã"}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link
                    href={
                      isEdit && campaignId
                        ? `/admin/campaigns/${campaignId}`
                        : "/admin/campaigns"
                    }
                  >
                    Hủy bỏ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}

interface BatchEditorProps {
  index: number;
  batch: VoucherBatchInput;
  rules: BatchRuleOption[];
  errors: FormErrors;
  canRemove: boolean;
  onChange: (patch: Partial<VoucherBatchInput>) => void;
  onRemove: () => void;
}

function BatchEditor({
  index,
  batch,
  rules,
  errors,
  canRemove,
  onChange,
  onRemove,
}: BatchEditorProps) {
  const key = (field: string) => `batches.${index}.${field}`;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <p className="font-medium">Lô mã {index + 1}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Xóa lô mã ${index + 1}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
          Xóa
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Loại lô (batch type)">
          <Select
            value={batch.batchType}
            onValueChange={(v) => onChange({ batchType: v as BatchType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(BATCH_TYPE_LABEL) as BatchType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {BATCH_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Quy tắc áp dụng (rule)" error={errors[key("ruleId")]}>
          <Select
            value={batch.ruleId}
            onValueChange={(v) => onChange({ ruleId: v })}
          >
            <SelectTrigger aria-invalid={!!errors[key("ruleId")]}>
              <SelectValue placeholder="Chọn quy tắc" />
            </SelectTrigger>
            <SelectContent>
              {rules.map((r) => (
                <SelectItem key={r.id} value={r.id} description={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tiền tố mã (prefix)" error={errors[key("prefix")]}>
          <Input
            value={batch.prefix}
            onChange={(e) => onChange({ prefix: e.target.value.toUpperCase() })}
            placeholder="ví dụ: TECH20_"
            className="font-mono"
            aria-invalid={!!errors[key("prefix")]}
          />
        </Field>

        <Field label="Độ dài chuỗi ngẫu nhiên" error={errors[key("length")]}>
          <Input
            type="number"
            min={6}
            max={16}
            value={batch.length}
            onChange={(e) => onChange({ length: Number(e.target.value) })}
            aria-invalid={!!errors[key("length")]}
          />
        </Field>

        <Field label="Bộ ký tự (charset)">
          <Select
            value={batch.charset}
            onValueChange={(v) => onChange({ charset: v as CharsetType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHARSET_LABEL) as CharsetType[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CHARSET_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Thời hạn sử dụng" error={errors[key("durationValue")]}>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={batch.durationValue}
              onChange={(e) =>
                onChange({ durationValue: Number(e.target.value) })
              }
              aria-invalid={!!errors[key("durationValue")]}
              className="flex-1"
            />
            <div className="w-32">
              <Select
                value={batch.durationUnit}
                onValueChange={(v) =>
                  onChange({ durationUnit: v as DurationUnit })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DURATION_LABEL) as DurationUnit[]).map((u) => (
                    <SelectItem key={u} value={u}>
                      {DURATION_LABEL[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Field>

        <Field label="Quota Email" error={errors[key("quota")]}>
          <Input
            type="number"
            min={0}
            value={batch.quotaEmail}
            onChange={(e) => onChange({ quotaEmail: Number(e.target.value) })}
            aria-invalid={!!errors[key("quota")]}
          />
        </Field>

        <Field label="Quota Webhook">
          <Input
            type="number"
            min={0}
            value={batch.quotaWebhook}
            onChange={(e) => onChange({ quotaWebhook: Number(e.target.value) })}
          />
        </Field>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

"use client";

import { BatchEditor } from "@/components/campaigns/campaign-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { quotaOf } from "@/lib/campaigns/format";
import {
  toFieldErrors,
  voucherBatchInputSchema,
  type Charset,
} from "@/lib/campaigns/schemas";
import { listRules, updateCampaignBatch } from "@/lib/campaigns/service";
import type {
  BatchRuleOption,
  VoucherBatchInput,
  VoucherBatchResponse,
} from "@/lib/campaigns/types";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface BatchEditDialogProps {
  batch: VoucherBatchResponse | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (batch: VoucherBatchResponse) => void;
}

function toBatchInput(b: VoucherBatchResponse): VoucherBatchInput {
  return {
    id: b.id,
    batchType: b.batchType,
    ruleId: b.ruleId,
    durationValue: b.durationValue,
    durationUnit: b.durationUnit,
    codeConfig: {
      prefix: b.codeConfig.prefix,
      length: b.codeConfig.length,
      charset: b.codeConfig.charset as Charset,
    },
    quotaEmail: quotaOf(b.distributionChannels, "EMAIL"),
    quotaWebhook: quotaOf(b.distributionChannels, "WEBHOOK"),
  };
}

export function BatchEditDialog({
  batch,
  onOpenChange,
  onSaved,
}: BatchEditDialogProps) {
  const [form, setForm] = useState<VoucherBatchInput | null>(null);
  const [rules, setRules] = useState<BatchRuleOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Mỗi lần mở dialog: nạp lại dữ liệu lô và danh sách quy tắc
  useEffect(() => {
    if (!batch) return;
    setForm(toBatchInput(batch));
    setErrors({});
    listRules()
      .then(setRules)
      .catch(() => toast.error("Không tải được danh sách quy tắc"));
  }, [batch]);

  const editable = batch?.status === "DRAFT";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!batch || !form || saving) return;

    const parsed = voucherBatchInputSchema.safeParse(form);
    if (!parsed.success) {
      // BatchEditor đọc lỗi theo dạng "batches.0.<trường>"
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [`batches.0.${k}`, v]),
        ),
      );
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const updated = await updateCampaignBatch(batch.id, parsed.data);
      toast.success(`Đã lưu lô mã #${updated.id}`);
      onSaved(updated);
    } catch (err) {
      toast.error("Không lưu được lô mã", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!batch}
      onOpenChange={(open) => !saving && onOpenChange(open)}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lô mã #{batch?.id}</DialogTitle>
          <DialogDescription>
            Chỉ chỉnh sửa được khi lô ở trạng thái chưa sinh mã.
          </DialogDescription>
        </DialogHeader>

        {batch && !editable && (
          <Alert>
            <AlertTitle>Lô đã sinh mã</AlertTitle>
            <AlertDescription>
              Lô này đã sinh mã nên không thể chỉnh sửa cấu hình.
            </AlertDescription>
          </Alert>
        )}

        {form && batch && editable && (
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <BatchEditor
              index={0}
              batch={form}
              rules={rules}
              errors={errors}
              canRemove={false}
              hideHeader
              onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

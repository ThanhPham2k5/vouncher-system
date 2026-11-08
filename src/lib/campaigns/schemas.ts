import { z } from "zod";
import {
  BATCH_TYPES,
  DURATION_UNITS,
  type DistributionChannels,
} from "./be-types";
import { MAX_BULK_QUOTA_PER_CHANNEL } from "./mock-data";

export const CHARSETS = ["ALPHANUMERIC", "ALPHABETIC"] as const;
export type Charset = (typeof CHARSETS)[number];

// Chuỗi từ <input type="datetime-local">: "YYYY-MM-DDTHH:mm"
const dateTimeLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Thời gian không hợp lệ");

export const codeConfigSchema = z.object({
  prefix: z
    .string()
    .regex(/^[A-Z0-9_]{2,10}$/, "Tiền tố 2–10 ký tự: A–Z, 0–9, _"),
  length: z
    .int({ error: "Độ dài phải là số nguyên" })
    .min(6, "Độ dài tối thiểu là 6")
    .max(16, "Độ dài tối đa là 16"),
  charset: z.enum(CHARSETS, { error: "Chọn bộ ký tự" }),
});

// Form nhập quota theo từng kênh, khi gửi đi sẽ đổi sang distributionChannels.allocations
export const voucherBatchInputSchema = z
  .object({
    id: z.int().optional(),
    batchType: z.enum(BATCH_TYPES, { error: "Chọn loại lô" }),
    ruleId: z
      .int({ error: "Chọn quy tắc áp dụng" })
      .min(1, "Chọn quy tắc áp dụng"),
    durationValue: z
      .int({ error: "Thời hạn phải là số nguyên" })
      .min(1, "Thời hạn tối thiểu là 1"),
    durationUnit: z.enum(DURATION_UNITS, { error: "Chọn đơn vị thời hạn" }),
    codeConfig: codeConfigSchema,
    quotaEmail: z
      .int({ error: "Quota phải là số nguyên" })
      .min(0, "Quota không âm"),
    quotaWebhook: z
      .int({ error: "Quota phải là số nguyên" })
      .min(0, "Quota không âm"),
    maxUsageCount: z
      .int({ error: "Số lần dùng tối đa phải là số nguyên" })
      .min(1, "Số lần dùng tối đa phải lớn hơn 0")
      .optional(),
  })
  .superRefine((v, ctx) => {
    // GENERIC: không nhập quota, chỉ nhập số lần dùng tối đa
    if (v.batchType === "GENERIC") {
      if (v.maxUsageCount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Nhập số lần dùng tối đa",
          path: ["maxUsageCount"],
        });
      }
      return;
    }

    // BULK: nhập quota theo kênh, mỗi kênh không vượt số địa chỉ mẫu
    if (v.quotaEmail + v.quotaWebhook <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Cần ít nhất một kênh có quota",
        path: ["quotaEmail"],
      });
    }
    if (v.quotaEmail > MAX_BULK_QUOTA_PER_CHANNEL) {
      ctx.addIssue({
        code: "custom",
        message: `Lô Bulk tối đa ${MAX_BULK_QUOTA_PER_CHANNEL} mã cho email`,
        path: ["quotaEmail"],
      });
    }
    if (v.quotaWebhook > MAX_BULK_QUOTA_PER_CHANNEL) {
      ctx.addIssue({
        code: "custom",
        message: `Lô Bulk tối đa ${MAX_BULK_QUOTA_PER_CHANNEL} mã cho webhook`,
        path: ["quotaWebhook"],
      });
    }
  });

export const campaignInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Tên chiến dịch tối thiểu 3 ký tự")
      .max(255, "Tên chiến dịch tối đa 255 ký tự"),
    startTime: dateTimeLocal,
    endTime: dateTimeLocal,
    batches: z.array(voucherBatchInputSchema).min(1, "Cần ít nhất một lô mã"),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endTime"],
  });

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type VoucherBatchInput = z.infer<typeof voucherBatchInputSchema>;

// Đổi quota từ form sang cấu trúc của spec
export function toDistributionChannels(
  input: Pick<VoucherBatchInput, "quotaEmail" | "quotaWebhook">,
): DistributionChannels {
  return {
    allocations: [
      { channel: "EMAIL", quota: input.quotaEmail },
      { channel: "WEBHOOK", quota: input.quotaWebhook },
    ],
  };
}

// Chuyển lỗi zod thành map theo đường dẫn, ví dụ "batches.0.codeConfig.prefix"
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

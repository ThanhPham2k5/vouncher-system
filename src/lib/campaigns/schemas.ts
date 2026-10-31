import { z } from "zod";
import { BATCH_TYPES, CAMPAIGN_STATUSES, DURATION_UNITS } from "./be-types";

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
  charset: z.enum(["ALPHANUMERIC", "UPPERCASE", "NUMERIC"], {
    error: "Chọn bộ ký tự",
  }),
});

export const distributionChannelsSchema = z
  .object({
    email: z.int({ error: "Quota phải là số nguyên" }).min(0, "Quota không âm"),
    webhook: z
      .int({ error: "Quota phải là số nguyên" })
      .min(0, "Quota không âm"),
  })
  .refine((v) => v.email + v.webhook > 0, {
    message: "Cần ít nhất một kênh có quota",
  });

export const voucherBatchInputSchema = z.object({
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
  distributionChannels: distributionChannelsSchema,
});

export const campaignInputSchema = z
  .object({
    campaignName: z
      .string()
      .trim()
      .min(3, "Tên chiến dịch tối thiểu 3 ký tự")
      .max(255, "Tên chiến dịch tối đa 255 ký tự"),
    startTime: dateTimeLocal,
    endTime: dateTimeLocal,
    status: z.enum(CAMPAIGN_STATUSES).optional(),
    voucherBatches: z
      .array(voucherBatchInputSchema)
      .min(1, "Cần ít nhất một lô mã"),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endTime"],
  });

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type VoucherBatchInput = z.infer<typeof voucherBatchInputSchema>;

// Chuyển lỗi zod thành map theo đường dẫn, ví dụ "voucherBatches.0.codeConfig.prefix"
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

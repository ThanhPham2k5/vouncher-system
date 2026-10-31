import type { CampaignInput } from "./types";

export type FormErrors = Record<string, string>;

const ID_PATTERN = /^[A-Z0-9_]{3,40}$/;
const PREFIX_PATTERN = /^[A-Z0-9_]{2,10}$/;

// Khóa lỗi theo đường dẫn trường, ví dụ "batches.0.prefix"
export function validateCampaign(input: CampaignInput): FormErrors {
  const errors: FormErrors = {};

  if (!ID_PATTERN.test(input.id)) {
    errors.id = "Chỉ gồm chữ in hoa, số và dấu gạch dưới (3–40 ký tự)";
  }
  if (input.name.trim().length < 3) {
    errors.name = "Tên chiến dịch tối thiểu 3 ký tự";
  }
  if (!input.startTime) {
    errors.startTime = "Vui lòng chọn thời gian bắt đầu";
  }
  if (!input.endTime) {
    errors.endTime = "Vui lòng chọn thời gian kết thúc";
  }
  if (
    input.startTime &&
    input.endTime &&
    new Date(input.endTime) <= new Date(input.startTime)
  ) {
    errors.endTime = "Thời gian kết thúc phải sau thời gian bắt đầu";
  }
  if (!(input.budgetTotal > 0)) {
    errors.budgetTotal = "Ngân sách phải lớn hơn 0";
  }
  if (
    !(input.budgetThreshold > 0) ||
    input.budgetThreshold > input.budgetTotal
  ) {
    errors.budgetThreshold = "Ngưỡng phải lớn hơn 0 và không vượt ngân sách";
  }
  if (input.batches.length === 0) {
    errors.batches = "Cần ít nhất một lô mã";
  }

  input.batches.forEach((batch, i) => {
    const key = (field: string) => `batches.${i}.${field}`;

    if (!batch.ruleId) {
      errors[key("ruleId")] = "Chọn quy tắc áp dụng";
    }
    if (!PREFIX_PATTERN.test(batch.prefix)) {
      errors[key("prefix")] = "Tiền tố 2–10 ký tự: A–Z, 0–9, _";
    }
    if (
      !Number.isInteger(batch.length) ||
      batch.length < 6 ||
      batch.length > 16
    ) {
      errors[key("length")] = "Độ dài từ 6 đến 16";
    }
    if (!Number.isInteger(batch.durationValue) || batch.durationValue < 1) {
      errors[key("durationValue")] = "Thời hạn tối thiểu là 1";
    }
    if (
      !Number.isInteger(batch.quotaEmail) ||
      !Number.isInteger(batch.quotaWebhook) ||
      batch.quotaEmail < 0 ||
      batch.quotaWebhook < 0
    ) {
      errors[key("quota")] = "Quota phải là số nguyên không âm";
    } else if (batch.quotaEmail + batch.quotaWebhook === 0) {
      errors[key("quota")] = "Cần ít nhất một kênh có quota";
    }
  });

  return errors;
}

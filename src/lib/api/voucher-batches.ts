// BE: GET/POST /voucher-batches, PATCH /voucher-batches/{id}.
// BE không có tham số lọc theo chiến dịch nên lọc ở client.
import type {
  BatchType,
  VoucherBatchCreateRequest,
  VoucherBatchResponse,
  VoucherBatchUpdateRequest,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

// BE nhận thêm batchType khi sửa, be-types chưa khai báo trường này
export type VoucherBatchPatch = VoucherBatchUpdateRequest & {
  batchType?: BatchType;
};

export async function listVoucherBatches(
  campaignId?: number,
): Promise<VoucherBatchResponse[]> {
  const all = await adminRequest<VoucherBatchResponse[]>("voucher-batches");
  return campaignId === undefined
    ? all
    : all.filter((b) => b.campaignId === campaignId);
}

export function createVoucherBatch(
  req: VoucherBatchCreateRequest,
): Promise<VoucherBatchResponse> {
  return adminRequest<VoucherBatchResponse>("voucher-batches", {
    method: "POST",
    body: req,
  });
}

// BE chỉ cho sửa lô ở trạng thái DRAFT. Lô đã GENERATED không sửa được.
export function updateVoucherBatch(
  id: number,
  req: VoucherBatchPatch,
): Promise<VoucherBatchResponse> {
  return adminRequest<VoucherBatchResponse>(`voucher-batches/${id}`, {
    method: "PATCH",
    body: req,
  });
}

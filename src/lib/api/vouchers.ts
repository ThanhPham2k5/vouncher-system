// BE: GET /vouchers (batchId, campaignId), GET /vouchers/{id},
// GET /vouchers/code/{code}, GET /vouchers/customer (customerId, status).
// BE không lọc theo voucherId nên phần đó lọc ở client.
import type {
  CustomerVoucherResponse,
  CustomerVoucherStatus,
  VoucherResponse,
  CustomerVoucherCreateRequest,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

export interface VoucherFilter {
  batchId?: number;
  campaignId?: number;
}

export function listVouchers(
  filter: VoucherFilter = {},
): Promise<VoucherResponse[]> {
  return adminRequest<VoucherResponse[]>("vouchers", {
    query: { batchId: filter.batchId, campaignId: filter.campaignId },
  });
}

export function getVoucher(id: number): Promise<VoucherResponse> {
  return adminRequest<VoucherResponse>(`vouchers/${id}`);
}

export function getVoucherByCode(code: string): Promise<VoucherResponse> {
  return adminRequest<VoucherResponse>(
    `vouchers/code/${encodeURIComponent(code.trim())}`,
  );
}

export interface CustomerVoucherFilter {
  customerId?: string;
  voucherId?: number;
  status?: CustomerVoucherStatus;
}

// Ví khách hàng. Lọc theo voucherId được làm ở client sau khi BE trả danh sách.
export async function listCustomerVouchers(
  filter: CustomerVoucherFilter = {},
): Promise<CustomerVoucherResponse[]> {
  const all = await adminRequest<CustomerVoucherResponse[]>(
    "vouchers/customer",
    {
      query: { customerId: filter.customerId, status: filter.status },
    },
  );
  return filter.voucherId === undefined
    ? all
    : all.filter((w) => w.voucherId === filter.voucherId);
}

// POST /vouchers/customer: thêm mã vào ví khách. customerId do FE truyền vào vì BE không quản lý khách.
export function createCustomerVoucher(
  req: CustomerVoucherCreateRequest,
): Promise<CustomerVoucherResponse> {
  return adminRequest<CustomerVoucherResponse>("vouchers/customer", {
    method: "POST",
    body: req,
  });
}

// DELETE /vouchers/customer/{id}: xóa mã khỏi ví khách
export function deleteCustomerVoucher(id: number): Promise<void> {
  return adminRequest<void>(`vouchers/customer/${id}`, { method: "DELETE" });
}

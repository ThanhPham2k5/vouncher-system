// Mock theo spec "Vouchers": /vouchers, /vouchers/{id}, /vouchers/customer, /vouchers/customer/{id}.
// Voucher được sinh từ MOCK_BATCHES (tối đa 6 mã mỗi lô để danh sách gọn).
import { MOCK_BATCHES } from "@/lib/campaigns/mock-data";
import type {
  CustomerVoucherCreateRequest,
  CustomerVoucherResponse,
  CustomerVoucherStatus,
  CustomerVoucherUpdateRequest,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { badRequest, clone, nextId, notFound, nowIso, wait } from "./common";

function buildVouchers(): VoucherResponse[] {
  let counter = 1;
  return MOCK_BATCHES.flatMap((batch) => {
    const count = Math.min(batch.generatedCount, 6);
    return Array.from({ length: count }, () => {
      const id = counter++;
      const { prefix } = batch.codeConfig;
      // Đếm toàn cục để mã không trùng nhau giữa các lô
      const code = `${prefix}${id.toString(36).toUpperCase()}`;
      return { id, batchId: batch.id, campaignId: batch.campaignId, code };
    });
  });
}

let vouchers: VoucherResponse[] = buildVouchers();

function seedWallet(): CustomerVoucherResponse[] {
  const pick = (i: number) => vouchers[i]?.id ?? 1;
  return [
    {
      id: 1,
      customerId: 1,
      voucherId: pick(0),
      status: "AVAILABLE",
      claimedAt: "2025-10-02T09:00:00Z",
      expiredAt: "2026-12-31T23:59:59Z",
    },
    {
      id: 2,
      customerId: 1,
      voucherId: pick(1),
      status: "USED",
      claimedAt: "2025-10-05T10:00:00Z",
      expiredAt: null,
    },
    {
      id: 3,
      customerId: 2,
      voucherId: pick(2),
      status: "AVAILABLE",
      claimedAt: "2025-10-10T08:30:00Z",
      expiredAt: "2026-12-31T23:59:59Z",
    },
    {
      id: 4,
      customerId: 2,
      voucherId: pick(3),
      status: "EXPIRED",
      claimedAt: "2025-06-01T08:00:00Z",
      expiredAt: "2025-06-30T23:59:59Z",
    },
  ];
}

let wallet: CustomerVoucherResponse[] = seedWallet();

// Đọc đồng bộ, dùng nội bộ ở mock (phân phối, đổi mã, thống kê)
export function getVouchersSnapshot(): VoucherResponse[] {
  return vouchers;
}

export function findVoucherByCode(code: string): VoucherResponse | undefined {
  return vouchers.find((v) => v.code === code);
}

export function firstVoucherOfBatch(
  batchId: number,
): VoucherResponse | undefined {
  return vouchers.find((v) => v.batchId === batchId);
}

export function getWalletEntry(
  customerId: number,
  voucherId: number,
): CustomerVoucherResponse | undefined {
  return wallet.find(
    (w) => w.customerId === customerId && w.voucherId === voucherId,
  );
}

export function setWalletStatus(
  id: number,
  status: CustomerVoucherStatus,
): void {
  wallet = wallet.map((w) => (w.id === id ? { ...w, status } : w));
}

// ---- Vouchers: GET /vouchers, GET /vouchers/{id}, GET /vouchers/by-code/{code} ----
export interface VoucherFilter {
  batchId?: number;
  campaignId?: number;
}

export async function listVouchers(
  filter: VoucherFilter = {},
): Promise<VoucherResponse[]> {
  await wait(300);
  return clone(
    vouchers.filter(
      (v) =>
        (filter.batchId === undefined || v.batchId === filter.batchId) &&
        (filter.campaignId === undefined || v.campaignId === filter.campaignId),
    ),
  );
}

export async function getVoucher(id: number): Promise<VoucherResponse> {
  await wait(200);
  const found = vouchers.find((v) => v.id === id);
  if (!found) notFound("mã giảm giá");
  return clone(found);
}

export async function getVoucherByCode(code: string): Promise<VoucherResponse> {
  await wait(200);
  const found = findVoucherByCode(code);
  if (!found) notFound("mã giảm giá");
  return clone(found);
}

// ---- Ví khách hàng: GET/POST /vouchers/customer, GET/PATCH/DELETE /vouchers/customer/{id} ----
export interface CustomerVoucherFilter {
  customerId?: number;
  voucherId?: number;
  status?: CustomerVoucherStatus;
}

export async function listCustomerVouchers(
  filter: CustomerVoucherFilter = {},
): Promise<CustomerVoucherResponse[]> {
  await wait(300);
  return clone(
    wallet.filter(
      (w) =>
        (filter.customerId === undefined ||
          w.customerId === filter.customerId) &&
        (filter.voucherId === undefined || w.voucherId === filter.voucherId) &&
        (filter.status === undefined || w.status === filter.status),
    ),
  );
}

export async function getCustomerVoucher(
  id: number,
): Promise<CustomerVoucherResponse> {
  await wait(200);
  const found = wallet.find((w) => w.id === id);
  if (!found) notFound("bản ghi ví voucher");
  return clone(found);
}

// Spec: GET /vouchers/customer/{customer_id} trả về danh sách voucher trong ví của một khách
export async function listWalletByCustomer(
  customerId: number,
): Promise<CustomerVoucherResponse[]> {
  await wait(300);
  return clone(wallet.filter((w) => w.customerId === customerId));
}

export async function createCustomerVoucher(
  req: CustomerVoucherCreateRequest,
): Promise<CustomerVoucherResponse> {
  await wait();
  if (!vouchers.some((v) => v.id === req.voucherId)) notFound("mã giảm giá");
  if (getWalletEntry(req.customerId, req.voucherId)) {
    badRequest("Khách hàng đã có voucher này trong ví");
  }
  const created: CustomerVoucherResponse = {
    id: nextId(wallet.map((w) => w.id)),
    customerId: req.customerId,
    voucherId: req.voucherId,
    status: "AVAILABLE",
    claimedAt: nowIso(),
    expiredAt: req.expiredAt,
  };
  wallet = [...wallet, created];
  return clone(created);
}

export async function updateCustomerVoucher(
  id: number,
  req: CustomerVoucherUpdateRequest,
): Promise<CustomerVoucherResponse> {
  await wait();
  const existing = wallet.find((w) => w.id === id);
  if (!existing) notFound("bản ghi ví voucher");
  const updated: CustomerVoucherResponse = { ...existing, status: req.status };
  wallet = wallet.map((w) => (w.id === id ? updated : w));
  return clone(updated);
}

export async function deleteCustomerVoucher(id: number): Promise<void> {
  await wait();
  if (!wallet.some((w) => w.id === id)) notFound("bản ghi ví voucher");
  wallet = wallet.filter((w) => w.id !== id);
}

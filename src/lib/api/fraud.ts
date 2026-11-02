// Mock theo BE (ưu tiên) và spec "Fraud & Security": /fraud-logs và /black-lists.
import type {
  BlackListCreateRequest,
  BlackListResponse,
  BlacklistType,
  FraudLogCreateRequest,
  FraudLogResponse,
} from "@/lib/campaigns/be-types";
import { badRequest, clone, nextId, notFound, nowIso, wait } from "./common";

let fraudLogs: FraudLogResponse[] = [
  {
    id: 1,
    voucherId: 1,
    customerId: "3",
    ipAddress: "185.220.101.5",
    deviceFingerprint: "fp_canvas_masked",
    violationRule: "RULE_ANONYMOUS_IP_CROWDSEC",
    createAt: "2025-10-24T14:15:42Z",
  },
  {
    id: 2,
    voucherId: 2,
    customerId: "4",
    ipAddress: "113.161.45.19",
    deviceFingerprint: "fp_emu_and_x86",
    violationRule: "RULE_EMULATOR_DETECTED",
    createAt: "2025-10-24T10:42:18Z",
  },
];

let blacklist: BlackListResponse[] = [
  {
    id: 1,
    type: "CUSTOMER",
    value: "3",
    reason: "Gian lận tạo tài khoản ảo",
    isActive: true,
    createAt: "2025-10-20T09:00:00Z",
    expiredAt: null,
  },
  {
    id: 2,
    type: "DEVICE_FINGERPRINT",
    value: "fp_emu_and_x86",
    reason: "Giả lập Android x86",
    isActive: true,
    createAt: "2025-10-24T10:42:18Z",
    expiredAt: "2026-12-31T23:59:59Z",
  },
  {
    id: 3,
    type: "IP",
    value: "185.220.101.5",
    reason: "Máy chủ proxy ẩn danh (Tor)",
    isActive: true,
    createAt: "2025-10-24T14:15:42Z",
    expiredAt: "2026-12-31T23:59:59Z",
  },
];

// Đọc đồng bộ, dùng nội bộ ở mock (kiểm tra khi đổi mã)
export function isBlocked(args: {
  customerId: number;
  deviceFingerprint: string;
  ipAddress?: string;
}): boolean {
  const now = Date.now();
  return blacklist.some((b) => {
    const active =
      b.isActive && (!b.expiredAt || Date.parse(b.expiredAt) > now);
    if (!active) return false;
    if (b.type === "CUSTOMER") return b.value === String(args.customerId);
    if (b.type === "DEVICE_FINGERPRINT")
      return b.value === args.deviceFingerprint;
    return b.value === args.ipAddress;
  });
}

export function addFraudLog(req: FraudLogCreateRequest): FraudLogResponse {
  const created: FraudLogResponse = {
    id: nextId(fraudLogs.map((f) => f.id)),
    voucherId: req.voucherId,
    customerId: String(req.customerId),
    ipAddress: req.ipAddress,
    deviceFingerprint: req.deviceFingerprint,
    violationRule: req.violationRule,
    createAt: nowIso(),
  };
  fraudLogs = [...fraudLogs, created];
  return created;
}

// ---- Fraud logs: GET/POST /fraud-logs, GET /fraud-logs/{id} ----
export interface FraudLogFilter {
  customerId?: string;
  voucherId?: number;
}

export async function listFraudLogs(
  filter: FraudLogFilter = {},
): Promise<FraudLogResponse[]> {
  await wait(300);
  return clone(
    fraudLogs.filter(
      (f) =>
        (filter.customerId === undefined ||
          f.customerId === filter.customerId) &&
        (filter.voucherId === undefined || f.voucherId === filter.voucherId),
    ),
  );
}

export async function getFraudLog(id: number): Promise<FraudLogResponse> {
  await wait(200);
  const found = fraudLogs.find((f) => f.id === id);
  if (!found) notFound("nhật ký gian lận");
  return clone(found);
}

export async function createFraudLog(
  req: FraudLogCreateRequest,
): Promise<FraudLogResponse> {
  await wait();
  return clone(addFraudLog(req));
}

// ---- Blacklist: GET/POST /black-lists, GET /black-lists/{id}, PATCH /black-lists/{id} (BE: chỉ vô hiệu hóa) ----
export interface BlacklistFilter {
  type?: BlacklistType;
  value?: string;
}

export async function listBlacklist(
  filter: BlacklistFilter = {},
): Promise<BlackListResponse[]> {
  await wait(300);
  return clone(
    blacklist.filter(
      (b) =>
        (filter.type === undefined || b.type === filter.type) &&
        (filter.value === undefined || b.value === filter.value),
    ),
  );
}

export async function getBlacklist(id: number): Promise<BlackListResponse> {
  await wait(200);
  const found = blacklist.find((b) => b.id === id);
  if (!found) notFound("bản ghi trong danh sách đen");
  return clone(found);
}

export async function createBlacklist(
  req: BlackListCreateRequest,
): Promise<BlackListResponse> {
  await wait();
  if (!req.targetValue.trim()) badRequest("targetValue không được để trống");
  if (!req.reason.trim()) badRequest("reason không được để trống");
  if (req.expiredAt && Date.parse(req.expiredAt) <= Date.now()) {
    badRequest("expiredAt phải nằm trong tương lai");
  }
  const created: BlackListResponse = {
    id: nextId(blacklist.map((b) => b.id)),
    type: req.blacklistType,
    value: req.targetValue.trim(),
    reason: req.reason.trim(),
    isActive: true,
    createAt: nowIso(),
    expiredAt: req.expiredAt ?? null,
  };
  blacklist = [...blacklist, created];
  return clone(created);
}

// BE: PATCH /black-lists/{id} không nhận body, chỉ đặt isActive = false
export async function deactivateBlacklist(
  id: number,
): Promise<BlackListResponse> {
  await wait();
  const existing = blacklist.find((b) => b.id === id);
  if (!existing) notFound("bản ghi trong danh sách đen");
  const updated: BlackListResponse = { ...existing, isActive: false };
  blacklist = blacklist.map((b) => (b.id === id ? updated : b));
  return clone(updated);
}

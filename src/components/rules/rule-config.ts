// Chuyển đổi giữa form (chuỗi nhập tay) và config JSON theo đúng cấu trúc BE
// (src/main/resources/data/rule_metadata/*.json). Mỗi loại có danh sách field riêng.
import type {
  ConditionResponse,
  ConditionType,
  JsonObject,
  RewardResponse,
  RewardType,
} from "@/lib/campaigns/be-types";
import { MOCK_PRODUCTS } from "@/lib/store-products";
import type { OptionItem } from "./option-multi-select";

export type RuleKind = "REWARD" | "CONDITION";

export interface FieldDef {
  key: string;
  label: string;
  kind: "number" | "text" | "select" | "multi" | "conditions";
  path: string[]; // vị trí trong config, ví dụ ["buy", "quantity"]
  options?: OptionItem[];
  placeholder?: string;
  hint?: string;
  min?: number; // số nhỏ nhất (bao gồm)
  max?: number; // số lớn nhất (bao gồm)
  positive?: boolean; // phải > 0
  integer?: boolean;
  required?: boolean;
}

export interface RowDef {
  key: string; // tên mảng trong config (tiers, windows)
  path: string[];
  label: string;
  addLabel: string;
  columns: FieldDef[]; // path tương đối trong từng dòng
}

export interface TypeLayout {
  constants: JsonObject; // giá trị cố định BE yêu cầu, ví dụ calculationMode
  fields: FieldDef[];
  rows?: RowDef[];
}

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;

const PRODUCT_OPTIONS: OptionItem[] = MOCK_PRODUCTS.map((p) => ({
  value: p.sku,
  label: p.name,
  hint: p.sku,
}));

const SEGMENT_OPTIONS: OptionItem[] = [
  { value: "VIP", label: "VIP" },
  { value: "NORMAL", label: "NORMAL" },
];

// Loại điều kiện được phép dùng bên trong điều kiện kết hợp
export const SUB_CONDITION_TYPES: ConditionType[] = [
  "MIN_CART_AMOUNT",
  "TIME_WINDOW",
  "CUSTOMER_SEGMENT",
];

const REWARD_LAYOUTS: Record<RewardType, TypeLayout> = {
  PERCENTAGE: {
    constants: { amountBasis: "CART_SUBTOTAL" },
    fields: [
      {
        key: "discountPercent",
        label: "Phần trăm giảm (%)",
        kind: "number",
        path: ["discountPercent"],
        positive: true,
        max: 100,
        required: true,
      },
      {
        key: "maxDiscountAmount",
        label: "Giảm tối đa (₫)",
        kind: "number",
        path: ["maxDiscountAmount"],
        min: 0,
        required: true,
      },
    ],
  },
  FIXED: {
    constants: {},
    fields: [
      {
        key: "discountValue",
        label: "Số tiền giảm (₫)",
        kind: "number",
        path: ["discountValue"],
        positive: true,
        required: true,
      },
    ],
  },
  BUY_X_GET_Y: {
    constants: { calculationMode: "PER_QUALIFYING_SET" },
    fields: [
      {
        key: "buyProducts",
        label: "Sản phẩm mua",
        kind: "multi",
        path: ["buy", "productIds"],
        options: PRODUCT_OPTIONS,
        required: true,
      },
      {
        key: "buyQuantity",
        label: "Số lượng mua",
        kind: "number",
        path: ["buy", "quantity"],
        min: 1,
        integer: true,
        required: true,
      },
      {
        key: "getProducts",
        label: "Sản phẩm tặng",
        kind: "multi",
        path: ["get", "productIds"],
        options: PRODUCT_OPTIONS,
        required: true,
      },
      {
        key: "getQuantity",
        label: "Số lượng tặng",
        kind: "number",
        path: ["get", "quantity"],
        min: 1,
        integer: true,
        required: true,
      },
      {
        key: "getDiscountPercent",
        label: "Giảm giá sản phẩm tặng (%)",
        kind: "number",
        path: ["get", "discountPercent"],
        positive: true,
        max: 100,
        required: true,
        hint: "100 = tặng miễn phí",
      },
      {
        key: "maxApplications",
        label: "Số lần áp dụng tối đa / đơn",
        kind: "number",
        path: ["maxApplicationsPerOrder"],
        min: 1,
        integer: true,
        required: true,
      },
    ],
  },
  TIERED_PERCENTAGE: {
    constants: {
      calculationMode: "HIGHEST_MATCH",
      amountBasis: "CART_SUBTOTAL",
    },
    fields: [],
    rows: [
      {
        key: "tiers",
        path: ["tiers"],
        label: "Các bậc chiết khấu",
        addLabel: "Thêm bậc",
        columns: [
          {
            key: "minCartAmount",
            label: "Tổng tiền từ (₫)",
            kind: "number",
            path: ["minCartAmount"],
            min: 0,
            required: true,
          },
          {
            key: "discountPercent",
            label: "Giảm (%)",
            kind: "number",
            path: ["discountPercent"],
            positive: true,
            max: 100,
            required: true,
          },
          {
            key: "maxDiscountAmount",
            label: "Giảm tối đa (₫)",
            kind: "number",
            path: ["maxDiscountAmount"],
            min: 0,
            required: true,
          },
        ],
      },
    ],
  },
};

const CONDITION_LAYOUTS: Record<ConditionType, TypeLayout> = {
  MIN_CART_AMOUNT: {
    constants: { amountBasis: "CART_SUBTOTAL" },
    fields: [
      {
        key: "minimumAmount",
        label: "Giá trị tối thiểu (₫)",
        kind: "number",
        path: ["minimumAmount"],
        min: 0,
        required: true,
      },
    ],
  },
  TIME_WINDOW: {
    constants: { timezone: "Asia/Ho_Chi_Minh" },
    fields: [],
    rows: [
      {
        key: "windows",
        path: ["windows"],
        label: "Các khung giờ",
        addLabel: "Thêm khung giờ",
        columns: [
          {
            key: "startTime",
            label: "Bắt đầu (HH:mm:ss)",
            kind: "text",
            path: ["startTime"],
            placeholder: "12:00:00",
            required: true,
          },
          {
            key: "endTime",
            label: "Kết thúc (HH:mm:ss)",
            kind: "text",
            path: ["endTime"],
            placeholder: "14:00:00",
            required: true,
          },
        ],
      },
    ],
  },
  CUSTOMER_SEGMENT: {
    constants: {},
    fields: [
      {
        key: "operator",
        label: "Phép so sánh",
        kind: "select",
        path: ["operator"],
        options: [
          { value: "IN", label: "Thuộc nhóm" },
          { value: "NOT_IN", label: "Không thuộc nhóm" },
        ],
        required: true,
      },
      {
        key: "segments",
        label: "Nhóm khách hàng",
        kind: "multi",
        path: ["segments"],
        options: SEGMENT_OPTIONS,
        required: true,
      },
    ],
  },
  COMPOSITE: {
    constants: {},
    fields: [
      {
        key: "operator",
        label: "Cách kết hợp",
        kind: "select",
        path: ["operator"],
        options: [
          { value: "AND", label: "Và (AND) – tất cả đúng" },
          { value: "OR", label: "Hoặc (OR) – một trong các điều kiện đúng" },
        ],
        required: true,
      },
      {
        key: "subConditions",
        label: "Điều kiện con",
        kind: "conditions",
        path: ["conditions"],
        hint: "Mỗi điều kiện con chọn loại rồi nhập cấu hình như một điều kiện đơn.",
        required: true,
      },
    ],
  },
};

export function layoutFor(kind: RuleKind, type: string): TypeLayout {
  if (kind === "REWARD") {
    return REWARD_LAYOUTS[type as RewardType] ?? REWARD_LAYOUTS.PERCENTAGE;
  }
  return (
    CONDITION_LAYOUTS[type as ConditionType] ??
    CONDITION_LAYOUTS.MIN_CART_AMOUNT
  );
}

export function defaultType(kind: RuleKind): string {
  return kind === "REWARD" ? "PERCENTAGE" : "MIN_CART_AMOUNT";
}

export interface RuleForm {
  name: string;
  type: string;
  fields: Record<string, string>;
  rows: Record<string, string>[][]; // rows[i] tương ứng layout.rows[i]
  subs: RuleForm[]; // chỉ dùng cho COMPOSITE: mỗi điều kiện con là một form CONDITION
}

function emptyRow(def: RowDef): Record<string, string> {
  return Object.fromEntries(def.columns.map((c) => [c.key, ""]));
}

export function emptyForm(kind: RuleKind, type: string): RuleForm {
  const layout = layoutFor(kind, type);
  const isComposite = kind === "CONDITION" && type === "COMPOSITE";
  return {
    name: "",
    type,
    fields: Object.fromEntries(
      layout.fields.map((f) => [
        f.key,
        f.kind === "select" ? (f.options?.[0]?.value ?? "") : "",
      ]),
    ),
    rows: (layout.rows ?? []).map((r) => [emptyRow(r)]),
    subs: isComposite ? [emptyForm("CONDITION", "MIN_CART_AMOUNT")] : [],
  };
}

function readPath(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((cur, key) => {
    if (cur && typeof cur === "object")
      return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// Đổ config có sẵn vào form để sửa
function fillFromConfig(
  kind: RuleKind,
  type: string,
  cfg: unknown,
  name: string,
): RuleForm {
  const layout = layoutFor(kind, type);
  const form = emptyForm(kind, type);
  form.name = name;

  for (const f of layout.fields) {
    const raw = readPath(cfg, f.path);
    if (raw === undefined || raw === null) continue;
    if (f.kind === "conditions") {
      if (Array.isArray(raw) && raw.length > 0) {
        form.subs = raw.map((entry) =>
          fillFromConfig(
            "CONDITION",
            String(readPath(entry, ["type"]) ?? ""),
            readPath(entry, ["config"]),
            "",
          ),
        );
      }
      continue;
    }
    if (f.kind === "multi" && Array.isArray(raw)) {
      form.fields[f.key] = raw.map(String).join(", ");
    } else {
      form.fields[f.key] = String(raw);
    }
  }

  (layout.rows ?? []).forEach((def, i) => {
    const list = readPath(cfg, def.path);
    if (Array.isArray(list) && list.length > 0) {
      form.rows[i] = list.map((entry) =>
        Object.fromEntries(
          def.columns.map((c) => [
            c.key,
            String(readPath(entry, c.path) ?? ""),
          ]),
        ),
      );
    }
  });
  return form;
}

export function formFromItem(
  kind: RuleKind,
  item: RewardResponse | ConditionResponse,
): RuleForm {
  const type =
    kind === "REWARD"
      ? (item as RewardResponse).rewardType
      : (item as ConditionResponse).conditionType;
  return fillFromConfig(kind, type, item.config, item.name);
}

function setPath(obj: JsonObject, path: string[], value: unknown): void {
  let cur: Record<string, unknown> = obj;
  path.slice(0, -1).forEach((key) => {
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  });
  cur[path[path.length - 1]] = value;
}

type BuildResult = { config: JsonObject } | { error: string };

function parseField(
  def: FieldDef,
  raw: string,
): { value?: unknown; error?: string } {
  const text = raw.trim();
  if (def.kind === "number") {
    if (text === "")
      return def.required ? { error: `Nhập ${def.label.toLowerCase()}` } : {};
    const n = Number(text);
    if (!Number.isFinite(n)) return { error: `${def.label} phải là số` };
    if (def.integer && !Number.isInteger(n))
      return { error: `${def.label} phải là số nguyên` };
    if (def.positive && n <= 0) return { error: `${def.label} phải lớn hơn 0` };
    if (def.min !== undefined && n < def.min)
      return { error: `${def.label} không được nhỏ hơn ${def.min}` };
    if (def.max !== undefined && n > def.max)
      return { error: `${def.label} không được lớn hơn ${def.max}` };
    return { value: n };
  }
  if (def.kind === "multi") {
    const items = Array.from(
      new Set(
        text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (items.length === 0 && def.required)
      return { error: `Chọn ${def.label.toLowerCase()}` };
    return { value: items };
  }
  if (def.required && text === "")
    return { error: `Nhập ${def.label.toLowerCase()}` };
  return { value: text };
}

// Dựng config từ form, trả về lỗi tiếng Việt cho trường đầu tiên không hợp lệ
export function buildConfig(kind: RuleKind, form: RuleForm): BuildResult {
  const layout = layoutFor(kind, form.type);
  const config: JsonObject = { ...layout.constants };

  for (const f of layout.fields) {
    if (f.kind === "conditions") {
      if (form.subs.length === 0)
        return { error: `${f.label}: cần ít nhất 1 điều kiện` };
      const built: JsonObject[] = [];
      for (const sub of form.subs) {
        const res = buildConfig("CONDITION", sub);
        if ("error" in res) return { error: `${f.label}: ${res.error}` };
        built.push({ type: sub.type, config: res.config });
      }
      setPath(config, f.path, built);
      continue;
    }
    const parsed = parseField(f, form.fields[f.key] ?? "");
    if (parsed.error) return { error: parsed.error };
    if (parsed.value !== undefined) setPath(config, f.path, parsed.value);
  }

  for (let i = 0; i < (layout.rows ?? []).length; i++) {
    const def = layout.rows![i];
    const rows = form.rows[i] ?? [];
    if (rows.length === 0) return { error: `${def.label}: cần ít nhất 1 dòng` };
    const built: JsonObject[] = [];
    for (const row of rows) {
      const entry: JsonObject = {};
      for (const col of def.columns) {
        const parsed = parseField(col, row[col.key] ?? "");
        if (parsed.error) return { error: `${def.label}: ${parsed.error}` };
        if (
          col.kind === "text" &&
          col.key.endsWith("Time") &&
          parsed.value !== undefined
        ) {
          if (!TIME_PATTERN.test(String(parsed.value))) {
            return {
              error: `${def.label}: ${col.label} sai định dạng HH:mm:ss`,
            };
          }
        }
        if (parsed.value !== undefined) setPath(entry, col.path, parsed.value);
      }
      built.push(entry);
    }
    setPath(config, def.path, built);
  }

  return { config };
}

export function validateName(name: string): string | null {
  return name.trim() ? null : "Nhập tên cấu hình";
}

// Tóm tắt một dòng cho bảng
export function summarizeConfig(
  kind: RuleKind,
  type: string,
  config: JsonObject,
): string {
  const get = (path: string[]) => readPath(config, path);
  if (kind === "REWARD") {
    switch (type) {
      case "PERCENTAGE":
        return `Giảm ${get(["discountPercent"])}% · tối đa ${Number(get(["maxDiscountAmount"]) ?? 0).toLocaleString("vi-VN")} ₫`;
      case "FIXED":
        return `Giảm ${Number(get(["discountValue"]) ?? 0).toLocaleString("vi-VN")} ₫`;
      case "BUY_X_GET_Y":
        return `Mua ${get(["buy", "quantity"])} tặng ${get(["get", "quantity"])} (giảm ${get(["get", "discountPercent"])}%)`;
      case "TIERED_PERCENTAGE": {
        const tiers = get(["tiers"]);
        return Array.isArray(tiers) ? `${tiers.length} bậc chiết khấu` : "—";
      }
    }
    return "—";
  }
  switch (type) {
    case "MIN_CART_AMOUNT":
      return `Đơn từ ${Number(get(["minimumAmount"]) ?? 0).toLocaleString("vi-VN")} ₫`;
    case "TIME_WINDOW": {
      const windows = get(["windows"]);
      return Array.isArray(windows) ? `${windows.length} khung giờ` : "—";
    }
    case "CUSTOMER_SEGMENT": {
      const segs = get(["segments"]);
      const op = get(["operator"]) === "NOT_IN" ? "Không thuộc" : "Thuộc";
      return Array.isArray(segs) ? `${op}: ${segs.join(", ")}` : "—";
    }
    case "COMPOSITE": {
      const subs = get(["conditions"]);
      const op = get(["operator"]);
      return Array.isArray(subs) ? `${subs.length} điều kiện · ${op}` : "—";
    }
  }
  return "—";
}

export interface ConfigLine {
  label: string;
  value: string;
}

export interface ConfigSection {
  title?: string;
  lines: ConfigLine[];
}

function displayValue(def: FieldDef, raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (Array.isArray(raw)) return raw.length ? raw.map(String).join(", ") : "—";
  if (def.kind === "select")
    return def.options?.find((o) => o.value === raw)?.label ?? String(raw);
  if (typeof raw === "number") return raw.toLocaleString("vi-VN");
  return String(raw);
}

// Dòng nội dung cho dialog chi tiết, cùng thứ tự với form sửa
export function configSections(
  kind: RuleKind,
  type: string,
  config: JsonObject,
): ConfigSection[] {
  const layout = layoutFor(kind, type);
  const sections: ConfigSection[] = [];

  const plain = layout.fields.filter((f) => f.kind !== "conditions");
  if (plain.length > 0) {
    sections.push({
      lines: plain.map((f) => ({
        label: f.label,
        value: displayValue(f, readPath(config, f.path)),
      })),
    });
  }

  for (const f of layout.fields) {
    if (f.kind !== "conditions") continue;
    const list = readPath(config, f.path);
    if (!Array.isArray(list)) continue;
    list.forEach((entry, i) => {
      const subType = String(readPath(entry, ["type"]) ?? "");
      const subCfg = (readPath(entry, ["config"]) ?? {}) as JsonObject;
      const lines = configSections("CONDITION", subType, subCfg).flatMap(
        (s) => s.lines,
      );
      sections.push({ title: `${f.label} ${i + 1}`, lines });
    });
  }

  for (const def of layout.rows ?? []) {
    const list = readPath(config, def.path);
    if (!Array.isArray(list)) continue;
    list.forEach((entry, i) => {
      sections.push({
        title: `${def.label} ${i + 1}`,
        lines: def.columns.map((c) => ({
          label: c.label,
          value: displayValue(c, readPath(entry, c.path)),
        })),
      });
    });
  }
  return sections;
}

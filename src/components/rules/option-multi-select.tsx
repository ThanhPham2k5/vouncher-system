"use client";

export interface OptionItem {
  value: string;
  label: string;
  hint?: string;
}

interface OptionMultiSelectProps {
  id?: string;
  value: string[];
  options: OptionItem[];
  onChange: (next: string[]) => void;
}

// Selection box chọn nhiều giá trị. Dùng cho sản phẩm và nhóm khách hàng.
export function OptionMultiSelect({
  id,
  value,
  options,
  onChange,
}: OptionMultiSelectProps) {
  const known = new Set(options.map((o) => o.value));
  // Giữ các giá trị cũ không còn trong danh sách để không mất khi lưu
  const unknown = value.filter((v) => !known.has(v));
  const rowClass =
    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted";

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div id={id} className="space-y-2">
      <div className="max-h-56 overflow-y-auto rounded-md border p-1">
        {options.map((o) => (
          <label key={o.value} className={rowClass}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={value.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            <span className="flex-1 truncate">{o.label}</span>
            {o.hint ? (
              <span className="font-mono text-xs text-muted-foreground">
                {o.hint}
              </span>
            ) : null}
          </label>
        ))}
        {unknown.map((v) => (
          <label key={v} className={rowClass}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked
              onChange={() => toggle(v)}
            />
            <span className="flex-1 truncate text-muted-foreground">
              Không có trong danh sách
            </span>
            <span className="font-mono text-xs text-muted-foreground">{v}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Đã chọn {value.length}</p>
    </div>
  );
}

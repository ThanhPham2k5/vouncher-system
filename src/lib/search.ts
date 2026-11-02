// Tìm kiếm tiếng Việt:
// - Gõ không dấu: khớp mọi dấu (vd "cong" ra "Công", "Cống", "Cổng", "Đại" khi gõ "dai").
// - Gõ có dấu: ký tự có dấu phải khớp đúng dấu (vd "công" chỉ ra "Công", không ra "Cống").
// - Không phân biệt hoa/thường; nhiều từ phải liền nhau và đúng thứ tự.

// Chuẩn hóa chuỗi: NFC, chữ thường, gộp khoảng trắng. GIỮ nguyên dấu.
export function normalizeSearch(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

// Bỏ dấu của một ký tự (đ -> d)
function baseChar(ch: string): string {
  if (ch === "đ") return "d";
  const stripped = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return stripped === "" ? ch : stripped[0];
}

function tokenAt(hay: string, token: string, start: number): boolean {
  for (let j = 0; j < token.length; j++) {
    const q = token[j];
    const h = hay[start + j];
    if (q === h) continue;
    // Ký tự gõ không dấu thì khớp mọi biến thể có dấu của nó
    if (baseChar(q) === q && baseChar(h) === q) continue;
    return false;
  }
  return true;
}

function containsToken(hay: string, token: string): boolean {
  for (let i = 0; i + token.length <= hay.length; i++) {
    if (tokenAt(hay, token, i)) return true;
  }
  return false;
}

// query đã qua normalizeSearch (rỗng thì luôn khớp). Cả cụm query phải xuất hiện
// liền nhau, đúng thứ tự, trong ít nhất một trường.
export function matchesSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  if (!query) return true;
  return fields.some(
    (f) => f != null && containsToken(normalizeSearch(String(f)), query),
  );
}

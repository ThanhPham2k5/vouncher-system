"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { clampPage } from "@/lib/pagination";

const WINDOW_SIZE = 4; // số lượng nút trang hiển thị cùng lúc
const SCROLL_GAP = 16; // khoảng hở thêm giữa header và đầu danh sách (px)

interface PaginationBarProps {
  total: number;
  page: number; // đã clamp ở nơi gọi
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// Hiện tối đa 4 số trang, cố gắng giữ trang đang chọn ở vị trí thứ 2
function pageWindow(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 1, pageCount - WINDOW_SIZE + 1));
  const end = Math.min(pageCount, start + WINDOW_SIZE - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// Đo chiều cao header dính (sticky) ở đầu trang, trả về 0 nếu không có
function stickyHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>("header");
  if (!header) return 0;
  const pos = getComputedStyle(header).position;
  return pos === "sticky" || pos === "fixed"
    ? header.getBoundingClientRect().height
    : 0;
}

export function PaginationBar({
  total,
  page,
  pageSize,
  pageCount,
  onPageChange,
}: PaginationBarProps) {
  // Phần tử bao quanh thanh phân trang (Card hoặc khối chứa bảng) dùng làm mốc cuộn
  const rootRef = useRef<HTMLDivElement>(null);
  const [jumpDraft, setJumpDraft] = useState("");

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function goTo(next: number) {
    if (next === page) return;
    onPageChange(next);

    const anchor = rootRef.current?.parentElement;
    if (!anchor) return;
    const top =
      anchor.getBoundingClientRect().top +
      window.scrollY -
      stickyHeaderHeight() -
      SCROLL_GAP;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function commitJump() {
    const n = Number.parseInt(jumpDraft, 10);
    setJumpDraft("");
    if (Number.isNaN(n)) return;
    goTo(clampPage(n, pageCount));
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="tabular-nums">
        Hiển thị {from}–{to} trên {formatNumber(total)}
      </span>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goTo(1)}
          disabled={page <= 1}
          aria-label="Trang đầu"
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft />
        </Button>

        {pageWindow(page, pageCount).map((n) => {
          const active = n === page;
          return (
            <Button
              key={n}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 px-0 tabular-nums"
              aria-current={active ? "page" : undefined}
              onClick={() => goTo(n)}
            >
              {n}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goTo(page + 1)}
          disabled={page >= pageCount}
          aria-label="Trang sau"
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goTo(pageCount)}
          disabled={page >= pageCount}
          aria-label="Trang cuối"
        >
          <ChevronsRight />
        </Button>

        <div className="ml-2 flex items-center gap-2">
          <span className="whitespace-nowrap">Đến trang</span>
          <Input
            type="number"
            min={1}
            max={pageCount}
            value={jumpDraft}
            onChange={(e) => setJumpDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitJump();
              if (e.key === "Escape") setJumpDraft("");
            }}
            onBlur={() => {
              if (jumpDraft !== "") commitJump();
            }}
            placeholder={String(page)}
            aria-label="Nhập số trang cần đến"
            className="h-8 w-20 px-2 text-center"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcDistributedRate,
  calcRedemptionRate,
  calcRoi,
} from "@/lib/dashboard/metrics";
import type { CampaignPerformance } from "@/lib/dashboard/types";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatVnd,
} from "@/lib/format";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";

export function CampaignRanking({
  campaigns,
}: {
  campaigns: CampaignPerformance[];
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Khi bộ lọc đổi (danh sách mới) thì quay về trang 1
  useEffect(() => {
    setPage(1);
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Không có chiến dịch nào trong bộ lọc này.
      </p>
    );
  }

  const pageCount = pageCountOf(campaigns.length, pageSize);
  const safePage = clampPage(page, pageCount);
  const items = paginate(campaigns, safePage, pageSize);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">Chiến dịch</TableHead>
              <TableHead className="whitespace-nowrap text-right">
                Tiền đã giảm
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                Doanh thu có mã
              </TableHead>
              <TableHead className="whitespace-nowrap">
                Tỷ lệ dùng trên quota
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                ROI cận trên
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => {
              const redemption = calcRedemptionRate(c.issued, c.redeemed);
              const roi = c.cost === 0 ? null : calcRoi(c.cost, c.revenue);
              const distributed = c.distributed;
              const distributedRate =
                distributed === undefined
                  ? null
                  : calcDistributedRate(distributed, c.redeemed);

              return (
                <TableRow key={c.id}>
                  <TableCell className="max-w-[260px] align-top">
                    <p className="truncate font-medium" title={c.name}>
                      {c.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.batchCode}
                    </p>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-muted-foreground">
                    {formatVnd(c.cost)}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right align-top font-semibold tabular-nums">
                    {formatVnd(c.revenue)}
                  </TableCell>

                  <TableCell className="min-w-[220px] align-top">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 whitespace-nowrap text-xs tabular-nums">
                        <span className="font-semibold">
                          {formatPercent(redemption)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatNumber(c.redeemed)} / {formatNumber(c.issued)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, redemption)}%` }}
                        />
                      </div>
                      {distributed !== undefined && (
                        <p
                          className="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                          title="Chỉ tính lượt gửi qua kênh phân phối. Mã dùng trực tiếp trên web không nằm trong số này."
                        >
                          Đã gửi {formatNumber(distributed)} ·{" "}
                          {distributedRate === null
                            ? "—"
                            : `${formatPercent(distributedRate)} đã dùng`}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right align-top font-semibold tabular-nums">
                    {roi === null ? "—" : formatSignedPercent(roi)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        total={campaigns.length}
        page={safePage}
        pageSize={pageSize}
        pageCount={pageCountOf(campaigns.length, pageSize)}
        onPageChange={setPage}
      />
    </>
  );
}

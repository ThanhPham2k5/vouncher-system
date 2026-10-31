import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcRedemptionRate,
  calcRoi,
  rateCampaign,
} from "@/lib/dashboard/metrics";
import type { CampaignPerformance } from "@/lib/dashboard/types";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatVnd,
} from "@/lib/format";

const TONE_VARIANT = {
  excellent: "success",
  good: "default",
  "needs-work": "warning",
} as const;

export function CampaignRanking({
  campaigns,
}: {
  campaigns: CampaignPerformance[];
}) {
  if (campaigns.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Không có chiến dịch nào trong bộ lọc này.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chiến dịch khuyến mãi</TableHead>
          <TableHead className="text-right">Ngân sách chiết khấu</TableHead>
          <TableHead className="text-right">Doanh thu về</TableHead>
          <TableHead className="w-48">Tỷ lệ dùng mã</TableHead>
          <TableHead className="text-right">Tỷ suất ROI</TableHead>
          <TableHead>Đánh giá</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => {
          const roi = calcRoi(c.cost, c.revenue);
          const redemption = calcRedemptionRate(c.issued, c.redeemed);
          const rating = rateCampaign(roi);
          return (
            <TableRow key={c.id}>
              <TableCell>
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {c.batchCode}
                </p>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatVnd(c.cost)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatVnd(c.revenue)}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span>{formatPercent(redemption)}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(c.redeemed)}/{formatNumber(c.issued)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, redemption)}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatSignedPercent(roi)}
              </TableCell>
              <TableCell>
                <Badge variant={TONE_VARIANT[rating.tone]}>
                  {rating.label}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

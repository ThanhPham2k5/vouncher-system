"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pause, Pencil, Play, Rocket } from "lucide-react";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/campaigns/format";
import type { Campaign } from "@/lib/campaigns/types";
import { formatCompactVnd, formatNumber } from "@/lib/format";

interface CampaignTableProps {
  campaigns: Campaign[];
  busyId: string | null;
  onPause: (campaign: Campaign) => void;
  onResume: (campaign: Campaign) => void;
}

export function CampaignTable({
  campaigns,
  busyId,
  onPause,
  onResume,
}: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Không tìm thấy chiến dịch phù hợp.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chiến dịch / ID</TableHead>
          <TableHead>Thời gian hiệu lực</TableHead>
          <TableHead>Lô mã</TableHead>
          <TableHead>Quy tắc liên kết</TableHead>
          <TableHead className="w-56">Ngân sách đã chi</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => {
          const issued = c.batches.reduce(
            (sum, b) => sum + b.generatedCount,
            0,
          );
          const rules = Array.from(new Set(c.batches.map((b) => b.ruleId)));
          const spentPct =
            c.budgetTotal === 0
              ? 0
              : Math.min(100, (c.budgetSpent / c.budgetTotal) * 100);
          const busy = busyId === c.id;

          return (
            <TableRow key={c.id}>
              <TableCell>
                <Link
                  href={`/admin/campaigns/${c.id}`}
                  className="font-semibold hover:underline"
                >
                  {c.name}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {c.id}
                </p>
              </TableCell>

              <TableCell className="text-sm">
                <p className="tabular-nums">{formatDateTime(c.startTime)}</p>
                <p className="tabular-nums text-muted-foreground">
                  → {formatDateTime(c.endTime)}
                </p>
              </TableCell>

              <TableCell>
                <p className="font-semibold">{c.batches.length} lô</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(issued)} mã đã sinh
                </p>
              </TableCell>

              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {rules.map((rule) => (
                    <span
                      key={rule}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span>
                      {formatCompactVnd(c.budgetSpent)} /{" "}
                      {formatCompactVnd(c.budgetTotal)}
                    </span>
                    <span className="text-muted-foreground">
                      {spentPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${spentPct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <CampaignStatusBadge status={c.status} />
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/campaigns/${c.id}`}>
                      <Eye />
                      Chi tiết
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/campaigns/${c.id}/edit`}>
                      <Pencil />
                      Sửa
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Thao tác khác"
                        disabled={busy}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Thao tác vận hành</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {c.status === "ACTIVE" && (
                        <DropdownMenuItem
                          className="text-amber-600"
                          onSelect={() => onPause(c)}
                        >
                          <Pause />
                          Tạm dừng chiến dịch
                        </DropdownMenuItem>
                      )}
                      {c.status === "PAUSED" && (
                        <DropdownMenuItem onSelect={() => onResume(c)}>
                          <Play />
                          Tiếp tục chiến dịch
                        </DropdownMenuItem>
                      )}
                      {c.status === "DRAFT" && (
                        <DropdownMenuItem onSelect={() => onResume(c)}>
                          <Rocket />
                          Kích hoạt chiến dịch
                        </DropdownMenuItem>
                      )}
                      {c.status === "ENDED" && (
                        <DropdownMenuItem disabled>
                          Chiến dịch đã kết thúc
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

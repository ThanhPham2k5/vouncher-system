"use client";

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
import type { CampaignView } from "@/lib/campaigns/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { Eye, MoreHorizontal, Pause, Pencil, Play, Rocket } from "lucide-react";
import Link from "next/link";

interface CampaignTableProps {
  campaigns: CampaignView[];
  busyId: number | null;
  onPause: (campaign: CampaignView) => void;
  onResume: (campaign: CampaignView) => void;
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
          <TableHead className="whitespace-nowrap">Chiến dịch / ID</TableHead>
          <TableHead>Thời gian hiệu lực</TableHead>
          <TableHead className="whitespace-nowrap">Lô mã</TableHead>
          <TableHead className="whitespace-nowrap">
            <div className="w-32">Lượt dùng / tối đa</div>
          </TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="whitespace-nowrap text-center">
            Thao tác
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => {
          const generated = c.batches.reduce(
            (sum, b) => sum + b.generatedCount,
            0,
          );
          const maxUsage = c.batches.reduce(
            (sum, b) => sum + b.maxUsageCount,
            0,
          );
          const redeemed = c.batches.reduce(
            (sum, b) => sum + b.redeemedCount,
            0,
          );
          const usedPct = maxUsage === 0 ? 0 : (redeemed / maxUsage) * 100;
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
                  #{c.id}
                </p>
              </TableCell>

              <TableCell className="whitespace-nowrap text-sm tabular-nums">
                {formatDateTime(c.startTime)} → {formatDateTime(c.endTime)}
              </TableCell>

              <TableCell>
                <p className="font-semibold">{c.batches.length} lô</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(generated)} mã đã sinh
                </p>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                <div className="w-32 space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span>
                      {formatNumber(redeemed)} / {formatNumber(maxUsage)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPercent(usedPct)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, usedPct)}%` }}
                    />
                  </div>
                </div>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                <CampaignStatusBadge status={c.status} />
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-center gap-1">
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
                          Chiến dịch đã hết hạn
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

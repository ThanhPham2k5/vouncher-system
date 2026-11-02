"use client";

import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WALLET_STATUS_META } from "@/components/vouchers/voucher-status";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatNumber, formatVnd } from "@/lib/format";
import {
  findActiveBlock,
  voucherCodeMap,
  type SecurityData,
} from "./security-meta";

interface CustomerProfileDialogProps {
  customerId: string | null;
  data: SecurityData;
  onOpenChange: (open: boolean) => void;
  onBlock: (customerId: string) => void;
}

// Hồ sơ dựng từ dữ liệu đã tải: BE chưa có API khách hàng nên chỉ có ID,
// ví voucher, log đổi mã, log gian lận và danh sách đen.
export function CustomerProfileDialog({
  customerId,
  data,
  onOpenChange,
  onBlock,
}: CustomerProfileDialogProps) {
  const open = customerId !== null;
  const id = customerId ?? "";
  const codeOf = voucherCodeMap(data.vouchers);

  const redemptions = data.redemptions
    .filter((r) => r.customerId === id)
    .sort((a, b) => Date.parse(b.createAt) - Date.parse(a.createAt));
  const frauds = data.fraudLogs.filter((f) => f.customerId === id);
  const wallet = data.wallet.filter((w) => String(w.customerId) === id);
  const block = findActiveBlock(data.blacklist, "CUSTOMER", id);

  const success = redemptions.filter((r) => r.status === "SUCCESS");
  const saved = success.reduce((sum, r) => sum + r.discountAmount, 0);
  const devices = new Set(
    redemptions.map((r) => r.deviceFingerprint).filter(Boolean),
  );
  const ips = new Set(redemptions.map((r) => r.ipAddress).filter(Boolean));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-mono">Khách hàng {id}</DialogTitle>
            {block ? (
              <Badge variant="destructive">Đang bị chặn</Badge>
            ) : (
              <Badge variant="success">Bình thường</Badge>
            )}
          </div>
          <DialogDescription>
            Tổng hợp từ ví voucher, log đổi mã và nhật ký gian lận.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Lượt đổi mã</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(redemptions.length)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(success.length)} thành công
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Tiết kiệm</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatVnd(saved)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Vi phạm</p>
            <p
              className={
                frauds.length > 0
                  ? "text-lg font-semibold tabular-nums text-destructive"
                  : "text-lg font-semibold tabular-nums"
              }
            >
              {formatNumber(frauds.length)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Thiết bị / IP</p>
            <p className="text-lg font-semibold tabular-nums">
              {devices.size} / {ips.size}
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Ví voucher ({wallet.length})
          </h3>
          {wallet.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ví đang trống.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {wallet.map((w) => (
                <Badge
                  key={w.id}
                  variant={WALLET_STATUS_META[w.status].variant}
                  className="font-mono"
                >
                  {codeOf(w.voucherId)} · {WALLET_STATUS_META[w.status].label}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Lịch sử đổi mã ({redemptions.length})
          </h3>
          {redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có giao dịch nào.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã voucher</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Đơn gốc</TableHead>
                    <TableHead>Kết quả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.slice(0, 5).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">
                        {codeOf(r.voucherId)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(r.createAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        {formatVnd(r.originalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "SUCCESS" ? "success" : "destructive"
                          }
                        >
                          {r.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                        </Badge>
                        {r.failureReason ? (
                          <p className="mt-1 text-xs text-destructive">
                            {r.failureReason}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {frauds.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Vi phạm gian lận ({frauds.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {frauds.map((f) => (
                <Badge key={f.id} variant="destructive" className="font-mono">
                  {f.violationRule}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            variant="destructive"
            disabled={!!block}
            onClick={() => onBlock(id)}
          >
            <Ban />
            {block ? "Đã bị chặn" : "Khóa quyền áp mã"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

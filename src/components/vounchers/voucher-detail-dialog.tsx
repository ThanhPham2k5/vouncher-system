"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomerVouchers } from "@/lib/api/vouchers";
import type {
  CustomerVoucherResponse,
  VoucherBatchResponse,
  VoucherResponse,
} from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatNumber } from "@/lib/format";
import { WALLET_STATUS_META } from "./voucher-status";

interface VoucherDetailDialogProps {
  voucher: VoucherResponse | null;
  campaignName: string;
  batch: VoucherBatchResponse | undefined;
  onOpenChange: (open: boolean) => void;
}

// Đặt key theo id voucher ở nơi gọi để tải lại ví mỗi lần mở
export function VoucherDetailDialog({
  voucher,
  campaignName,
  batch,
  onOpenChange,
}: VoucherDetailDialogProps) {
  const [wallet, setWallet] = useState<CustomerVoucherResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!voucher) return;
    let active = true;
    setWallet(null);
    setError(null);
    listCustomerVouchers({ voucherId: voucher.id })
      .then((data) => {
        if (active) setWallet(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách ví khách hàng.");
      });
    return () => {
      active = false;
    };
  }, [voucher, attempt]);

  return (
    <Dialog open={!!voucher} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{voucher?.code}</DialogTitle>
          <DialogDescription>
            {campaignName} · Lô #{voucher?.batchId}
          </DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Đã cấp</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(batch.generatedCount)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Đã sử dụng</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(batch.redeemedCount)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">ID mã (voucher)</p>
              <p className="font-semibold tabular-nums">#{voucher?.id}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Ví khách hàng đang giữ mã này</p>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Không tải được dữ liệu</AlertTitle>
              <AlertDescription>
                <span>{error}</span>{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Thử lại
                </button>
              </AlertDescription>
            </Alert>
          ) : !wallet ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : wallet.length === 0 ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              Chưa có khách hàng nào nhận mã này.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Nhận lúc</TableHead>
                    <TableHead>Hết hạn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.map((w) => {
                    const meta = WALLET_STATUS_META[w.status];
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">
                          KH #{w.customerId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(w.claimedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.expiredAt
                            ? formatDateTime(w.expiredAt)
                            : "Không hết hạn"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

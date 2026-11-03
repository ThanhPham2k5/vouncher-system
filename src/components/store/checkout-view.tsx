"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Ticket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearCart,
  removeFromCart,
  setCartQuantity,
  useStoreCart,
  type CartItem,
} from "@/lib/store-cart";
import {
  formatVnd,
  previewDiscount,
  submitRedemption,
  type RedeemResult,
} from "@/lib/store-checkout";
import { listStoreProducts } from "@/lib/store-products";
import { listStoreVouchers, type StoreVoucher } from "@/lib/store-vouchers";

const MAX_QUANTITY = 99;

// Trạng thái lỗi gắn với đường dẫn ảnh, nên khi ảnh mới đến (sau khi tải danh sách) vẫn hiển thị được
function ItemImage({ src, alt }: { src?: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="80px"
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-6 w-6 text-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}

// Ô nhập số lượng: gõ trực tiếp, Enter hoặc rời ô để lưu, giá trị không hợp lệ thì quay lại số cũ
function QuantityField({ sku, quantity }: { sku: string; quantity: number }) {
  const [draft, setDraft] = useState(String(quantity));

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  function commit() {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || n < 1) {
      setDraft(String(quantity));
      return;
    }
    const next = Math.min(n, MAX_QUANTITY);
    setCartQuantity(sku, next);
    setDraft(String(next));
  }

  return (
    <div className="flex items-center">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none"
        aria-label="Giảm số lượng"
        disabled={quantity <= 1}
        onClick={() => setCartQuantity(sku, quantity - 1)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        value={draft}
        inputMode="numeric"
        aria-label="Số lượng"
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="h-8 w-12 rounded-none border-x-0 px-1 text-center tabular-nums"
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none"
        aria-label="Tăng số lượng"
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => setCartQuantity(sku, quantity + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

function CartRow({ item, imageUrl }: { item: CartItem; imageUrl?: string }) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <ItemImage src={imageUrl} alt={item.name} />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.sku} • {formatVnd(item.price)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuantityField sku={item.sku} quantity={item.quantity} />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => removeFromCart(item.sku)}
          >
            <Trash2 className="h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>
      <p className="whitespace-nowrap text-right font-semibold">
        {formatVnd(item.price * item.quantity)}
      </p>
    </div>
  );
}

export function CheckoutView() {
  const { items, subtotal } = useStoreCart();
  const [imageBySku, setImageBySku] = useState<Record<string, string>>({});
  const [vouchers, setVouchers] = useState<StoreVoucher[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<StoreVoucher | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listStoreProducts(), listStoreVouchers()]).then(
      ([products, list]) => {
        if (!active) return;
        setImageBySku(
          Object.fromEntries(products.map((p) => [p.sku, p.imageUrl])),
        );
        setVouchers(list);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const preview = useMemo(
    () => (applied ? previewDiscount(applied, subtotal) : null),
    [applied, subtotal],
  );

  const discount = preview?.applicable ? preview.discount : 0;
  const finalAmount = subtotal - discount;

  function handleApply() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    const found = vouchers.find((v) => v.code === code);
    if (!found) {
      toast.error("Mã không tồn tại", { description: code });
      return;
    }
    const check = previewDiscount(found, subtotal);
    if (!check.applicable) {
      toast.error("Chưa thể áp mã", { description: check.reason });
      return;
    }
    setApplied(found);
    setCodeInput("");
    toast.success("Đã áp dụng mã", { description: found.code });
  }

  async function handleConfirm() {
    if (!applied || items.length === 0) return;
    setSubmitting(true);
    try {
      const data = await submitRedemption(applied.code, items, subtotal);
      setResult(data);
      setApplied(null);
      clearCart();
      toast.success("Đặt hàng thành công");
    } catch (err) {
      toast.error("Không áp được mã", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Đặt hàng thành công</p>
            <p className="text-sm text-muted-foreground">
              Mã giao dịch #{result.redemptionLogId} • Mã {result.code}
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Đơn gốc</p>
              <p className="font-semibold">
                {formatVnd(result.originalAmount)}
              </p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Giảm</p>
              <p className="font-semibold text-primary">
                -{formatVnd(result.discountAmount)}
              </p>
            </div>
            <div className="rounded-md bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Thanh toán</p>
              <p className="font-semibold text-primary">
                {formatVnd(result.finalAmount)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/store/products">Tiếp tục mua sắm</Link>
            </Button>
            <Button asChild>
              <Link href="/store/history">Xem lịch sử áp mã</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Giỏ hàng đang trống</p>
          <Button asChild variant="outline">
            <Link href="/store/products">Đi tới Sản phẩm</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Sản phẩm trong giỏ</CardTitle>
          <Badge variant="muted">{items.length} sản phẩm</Badge>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <CartRow
              key={item.sku}
              item={item}
              imageUrl={imageBySku[item.sku]}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-base">Mã giảm giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApply();
                  }}
                  placeholder="Nhập mã, ví dụ FLASHSALE20"
                  className="pl-9 font-mono uppercase"
                  aria-label="Nhập mã giảm giá"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleApply}
                disabled={!codeInput.trim()}
              >
                Áp dụng
              </Button>
            </div>
            {applied && (
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-sm">
                <span className="font-mono font-semibold">{applied.code}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setApplied(null)}
                >
                  Bỏ mã
                </button>
              </div>
            )}
            {preview?.giftNote && (
              <p className="text-xs text-muted-foreground">
                Quà tặng: {preview.giftNote}
              </p>
            )}
          </div>

          <div className="space-y-3 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tạm tính</span>
              <span>{formatVnd(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giảm giá</span>
              <span
                className={
                  discount > 0 ? "text-primary" : "text-muted-foreground"
                }
              >
                {discount > 0 ? `-${formatVnd(discount)}` : "Chưa áp mã"}
              </span>
            </div>
            <div className="flex items-end justify-between border-t pt-3">
              <span className="font-medium">Thành tiền</span>
              <span className="text-2xl font-bold text-primary">
                {formatVnd(finalAmount)}
              </span>
            </div>
          </div>

          {applied && preview && !preview.applicable && (
            <p className="text-xs text-destructive">{preview.reason}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!applied || submitting}
            onClick={handleConfirm}
          >
            {submitting
              ? "Đang xử lý..."
              : `Đặt hàng • ${formatVnd(finalAmount)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {applied
              ? "Số tiền chính thức do máy chủ xác nhận khi đặt hàng."
              : "Cần áp một mã giảm giá để đặt hàng."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

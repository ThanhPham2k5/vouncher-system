"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCustomerVouchers } from "@/lib/api/vouchers";
import type { CustomerVoucherResponse } from "@/lib/campaigns/be-types";
import {
  addToCart,
  clearCart,
  removeFromCart,
  setCartQuantity,
  useStoreCart,
  type CartItem,
} from "@/lib/store-cart";
import {
  formatVnd,
  submitRedemption,
  type RedeemResult,
} from "@/lib/store-checkout";
import {
  loadWalletRules,
  previewWalletRule,
  type WalletPreview,
  type WalletRule,
} from "@/lib/store-checkout-rules";
import { segmentsOfCustomerId } from "@/lib/store-customers";
import { listStoreProducts, type StoreProduct } from "@/lib/store-products";
import {
  CheckCircle2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const MAX_QUANTITY = 99;
const NONE = "NONE";

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

// Sản phẩm tặng: số lượng tặng đã được tính theo số lần áp dụng trong giỏ
function GiftPicker({
  skus,
  products,
  units,
  onAdd,
}: {
  skus: string[];
  products: StoreProduct[];
  units: number;
  onAdd: (product: StoreProduct, units: number) => void;
}) {
  const list = products.filter((p) => skus.includes(p.sku));
  if (list.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Chọn sản phẩm tặng • được tặng {units} sản phẩm
      </p>
      <ul className="space-y-2">
        {list.map((p) => (
          <li
            key={p.sku}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="min-w-0 truncate">{p.name}</span>
            <Button size="sm" variant="outline" onClick={() => onAdd(p, units)}>
              Thêm {units} vào giỏ
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CheckoutViewProps {
  customerId: string | null;
}

export function CheckoutView({ customerId }: CheckoutViewProps) {
  const { items, subtotal } = useStoreCart();
  const [productList, setProductList] = useState<StoreProduct[]>([]);
  // Quy tắc thật của các mã khách đang có trong kho
  const [walletRules, setWalletRules] = useState<WalletRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [products, owned] = await Promise.all([
        listStoreProducts(),
        customerId
          ? listCustomerVouchers({ customerId, status: "AVAILABLE" })
          : Promise.resolve<CustomerVoucherResponse[]>([]),
      ]);
      const rules = await loadWalletRules(
        new Set(owned.map((w) => w.voucherId)),
      );
      if (!active) return;
      setProductList(products);
      setWalletRules(rules);
    })()
      .catch(() => {
        if (active) toast.error("Không tải được kho mã");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  const imageBySku = useMemo(
    () => Object.fromEntries(productList.map((p) => [p.sku, p.imageUrl])),
    [productList],
  );

  // Xem thử từng mã theo giỏ hiện tại, cập nhật khi giỏ thay đổi
  const customerSegments = useMemo(
    () => segmentsOfCustomerId(customerId),
    [customerId],
  );

  const previews = useMemo(() => {
    const map = new Map<string, WalletPreview>();
    for (const rule of walletRules) {
      map.set(
        rule.code,
        previewWalletRule(rule, items, subtotal, customerSegments),
      );
    }
    return map;
  }, [walletRules, items, subtotal, customerSegments]);

  const selectedRule = walletRules.find((r) => r.code === selectedCode);
  const selectedPreview = selectedCode ? previews.get(selectedCode) : undefined;
  const blocked = selectedPreview?.applicable === false;
  const discount = selectedPreview && !blocked ? selectedPreview.discount : 0;
  const finalAmount = subtotal - discount;
  const cartQty = Object.fromEntries(items.map((i) => [i.sku, i.quantity]));
  const giftUnits = selectedPreview?.buyGet
    ? selectedPreview.buyGet.getQuantity *
      Math.max(1, selectedPreview.buyGet.applications)
    : 0;
  // Tổng số lượng sản phẩm thuộc nhóm tặng đang có trong giỏ
  const giftInCart = selectedPreview?.buyGet
    ? selectedPreview.buyGet.getProductIds.reduce(
        (sum, sku) => sum + (cartQty[sku] ?? 0),
        0,
      )
    : 0;
  const remainingUnits = Math.max(0, giftUnits - giftInCart);

  function handleSelect(code: string) {
    if (code === NONE) {
      setSelectedCode("");
      return;
    }
    setSelectedCode(code);
    if (previews.get(code)?.applicable !== false) {
      toast.success("Đã chọn mã", { description: code });
    }
  }

  function handleAddGift(product: StoreProduct, units: number) {
    addToCart(product);
    setCartQuantity(product.sku, (cartQty[product.sku] ?? 0) + units);
    toast.success("Đã thêm sản phẩm tặng", {
      description: `${product.name} × ${units}`,
    });
  }

  async function handleConfirm() {
    if (!selectedCode || blocked || items.length === 0) return;
    setSubmitting(true);
    try {
      const data = await submitRedemption(selectedCode, items, subtotal);
      setResult(data);
      setSelectedCode("");
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
            <Select
              value={selectedCode || NONE}
              onValueChange={handleSelect}
              disabled={walletRules.length === 0}
            >
              <SelectTrigger
                aria-label="Chọn mã trong kho"
                className="font-mono"
              >
                <SelectValue placeholder="Chọn mã từ kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Không áp mã</SelectItem>
                {walletRules.map((rule) => (
                  <SelectItem key={rule.code} value={rule.code}>
                    {rule.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loaded && walletRules.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Kho mã đang trống hoặc không có mã khả dụng. Lưu mã ở trang Săn
                mã trước.
              </p>
            )}
          </div>

          {selectedRule && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{selectedRule.rewardName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedRule.headline}
                </p>
              </div>
              <div className="border-t pt-2 text-xs">
                <p className="mb-1 text-muted-foreground">
                  {selectedRule.conditionName}
                </p>
                <ul className="space-y-0.5">
                  {selectedRule.conditionLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedRule && blocked && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {selectedPreview?.reason}
            </p>
          )}

          {selectedRule?.rewardType === "BUY_X_GET_Y" &&
            selectedPreview?.buyGet &&
            remainingUnits > 0 && (
              <GiftPicker
                skus={selectedPreview.buyGet.getProductIds}
                products={productList}
                units={remainingUnits}
                onAdd={handleAddGift}
              />
            )}

          {selectedCode && (
            <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="font-mono font-semibold">{selectedCode}</span>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setSelectedCode("")}
              >
                Bỏ mã
              </button>
            </div>
          )}

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
                {discount > 0
                  ? `-${formatVnd(discount)}`
                  : selectedCode && !blocked
                    ? "Máy chủ tính khi đặt"
                    : "Chưa áp mã"}
              </span>
            </div>
            <div className="flex items-end justify-between border-t pt-3">
              <span className="font-medium">Thành tiền</span>
              <span className="text-2xl font-bold text-primary">
                {formatVnd(finalAmount)}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedCode || blocked || submitting}
            onClick={handleConfirm}
          >
            {submitting
              ? "Đang xử lý..."
              : `Đặt hàng • ${formatVnd(finalAmount)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {selectedCode
              ? "Số tiền chính thức do máy chủ xác nhận khi đặt hàng."
              : "Có thể đặt hàng không cần mã, hoặc chọn một mã trong kho."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

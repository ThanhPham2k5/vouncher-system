"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { addToCart, useStoreCart } from "@/lib/store-cart";
import {
  listStoreProducts,
  PRODUCT_CATEGORIES,
  type StoreProduct,
} from "@/lib/store-products";

const ALL = "Tất cả";
const PAGE_SIZE = 8; // 4 cột x 2 hàng
const SORT_OPTIONS = [
  { value: "featured", label: "Mới nhất & Nổi bật" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
];

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

// Ảnh lỗi (chưa có file) thì hiện icon thay thế
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <Package className="h-12 w-12 text-muted-foreground/60" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function ProductsView() {
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const { count, subtotal } = useStoreCart();

  useEffect(() => {
    let active = true;
    listStoreProducts().then((data) => {
      if (active) setProducts(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const all = products ?? [];
    return [ALL, ...PRODUCT_CATEGORIES].map((name) => ({
      name,
      count:
        name === ALL
          ? all.length
          : all.filter((p) => p.category === name).length,
    }));
  }, [products]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const list = (products ?? []).filter(
      (p) =>
        (category === ALL || p.category === category) &&
        matchesSearch(q, p.name, p.sku, p.description),
    );
    if (sort === "price-asc")
      return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc")
      return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, query, category, sort]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  function handleAdd(product: StoreProduct) {
    addToCart(product);
    toast.success("Đã thêm vào giỏ hàng", { description: product.name });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">
                Giỏ hàng thử nghiệm{" "}
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
                  {count} sản phẩm
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Sẵn sàng áp dụng mã giảm giá tại bước thanh toán
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tạm tính giỏ hàng</p>
              <p className="text-lg font-semibold text-primary">
                {formatVnd(subtotal)}
              </p>
            </div>
            <Button asChild disabled={count === 0}>
              <Link href="/store/checkout">Thanh toán ngay →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên sản phẩm, mã SKU..."
            className="pl-9"
            aria-label="Tìm sản phẩm"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-64">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            Sắp xếp:
          </span>
          <div className="flex-1">
            <SearchableSelect
              aria-label="Sắp xếp sản phẩm"
              value={sort}
              onValueChange={(v) => {
                setSort(v);
                setPage(1);
              }}
              options={SORT_OPTIONS}
              searchPlaceholder="Tìm kiểu sắp xếp..."
            />
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Danh mục"
      >
        {categoryCounts.map((c) => (
          <Button
            key={c.name}
            role="tab"
            aria-selected={category === c.name}
            variant={category === c.name ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCategory(c.name);
              setPage(1);
            }}
          >
            {c.name} ({c.count})
          </Button>
        ))}
      </div>

      {products === null ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không tìm thấy sản phẩm phù hợp.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {pageItems.map((product) => (
              <Card key={product.sku} className="flex flex-col overflow-hidden">
                <div className="relative h-40 bg-muted">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                  <span className="absolute left-3 top-3 z-10 rounded bg-background/90 px-2 py-0.5 font-mono text-xs text-primary">
                    {product.sku}
                  </span>
                  <span className="absolute bottom-3 right-3 z-10 rounded-full bg-background/90 px-2 py-0.5 text-xs">
                    {product.category}
                  </span>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-primary">
                      {formatVnd(product.price)}
                    </span>
                    <Button size="sm" onClick={() => handleAdd(product)}>
                      <ShoppingCart className="h-4 w-4" />
                      Thêm vào giỏ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationBar
            total={filtered.length}
            page={safePage}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </Card>
      )}
    </div>
  );
}

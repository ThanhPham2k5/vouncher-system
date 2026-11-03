"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Tag } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStoreCart } from "@/lib/store-cart";

const NAV_ITEMS = [
  { href: "/store/products", label: "Sản phẩm" },
  { href: "/store/vouchers", label: "Săn mã" },
  { href: "/store/wallet", label: "Kho mã" },
  { href: "/store/history", label: "Lịch sử dùng mã" },
];

interface StoreHeaderProps {
  username: string;
}

export function StoreHeader({ username }: StoreHeaderProps) {
  const pathname = usePathname();
  const { count } = useStoreCart();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/store/products" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Tag className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">PromoCloud</span>
            <span className="block text-xs text-muted-foreground">
              Storefront
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-5 md:flex"
          aria-label="Điều hướng cửa hàng"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "border-b-2 border-primary pb-1 text-sm font-medium text-primary"
                    : "pb-1 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/store/checkout"
            aria-label={`Giỏ hàng, ${count} sản phẩm`}
            className="relative rounded-md p-2 hover:bg-accent"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{username}</p>
          </div>
          <ThemeToggle />
          <LogoutButton
            endpoint="/api/store/logout"
            redirectTo="/store/login"
          />
        </div>
      </div>
    </header>
  );
}

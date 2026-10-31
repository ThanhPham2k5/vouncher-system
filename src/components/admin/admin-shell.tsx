"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  Send,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { href: "/admin/campaigns", label: "Chiến dịch", icon: Megaphone },
  {
    href: "/admin/distribution",
    label: "Kênh phân phối",
    icon: Send,
    soon: true,
  },
  {
    href: "/admin/customers",
    label: "Khách hàng & Gian lận",
    icon: ShieldAlert,
    soon: true,
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold">PromoCloud Admin</p>
              <p className="text-xs text-muted-foreground">Enterprise Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton
              endpoint="/api/admin/logout"
              redirectTo="/admin/login"
            />
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4"
          aria-label="Điều hướng quản trị"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.soon) {
              return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground/60"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <span className="rounded bg-muted px-1.5 text-[10px]">
                    Sắp có
                  </span>
                </span>
              );
            }

            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

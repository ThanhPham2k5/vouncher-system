import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="text-3xl font-bold tracking-tight">PromoCloud</h1>
      <p className="text-muted-foreground">Chọn khu vực bạn muốn truy cập</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/admin/login" className={cn(buttonVariants({ size: "lg" }))}>
          Quản trị viên
        </Link>
        <Link href="/store/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Khách hàng
        </Link>
      </div>
    </main>
  );
}

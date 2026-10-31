"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  endpoint: string;
  redirectTo: string;
}

export function LogoutButton({ endpoint, redirectTo }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(endpoint, { method: "POST" });
      toast.success("Đã đăng xuất");
      router.replace(redirectTo);
      router.refresh();
    } catch {
      toast.error("Đăng xuất thất bại", { description: "Vui lòng thử lại." });
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
      Đăng xuất
    </Button>
  );
}

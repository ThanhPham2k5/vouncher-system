import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  hint?: ReactNode;
  icon: LucideIcon;
  highlight?: "positive" | "neutral";
}

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  highlight = "neutral",
}: KpiCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p
          className={cn(
            "text-2xl font-bold tracking-tight tabular-nums",
            highlight === "positive" &&
              "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {value}
        </p>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

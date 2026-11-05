"use client";

import { summarizeConfig, type RuleKind } from "@/components/rules/rule-config";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ConditionResponse,
  RewardResponse,
  RuleMetadataResponse,
  RuleStatus,
} from "@/lib/campaigns/be-types";

export type RuleItem = RewardResponse | ConditionResponse;

const STATUS_BADGE: Record<
  RuleStatus,
  { label: string; variant: "success" | "muted" }
> = {
  PUBLISHED: { label: "Đã xuất bản", variant: "success" },
  DRAFT: { label: "Nháp", variant: "muted" },
};

interface RuleDetailDialogProps {
  item: RuleItem | null;
  kind: RuleKind;
  metadata: RuleMetadataResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function RuleDetailDialog({
  item,
  kind,
  metadata,
  onOpenChange,
}: RuleDetailDialogProps) {
  const type = item
    ? kind === "REWARD"
      ? (item as RewardResponse).rewardType
      : (item as ConditionResponse).conditionType
    : "";
  const types =
    kind === "REWARD" ? metadata?.rewardTypes : metadata?.conditionTypes;
  const typeLabel = types?.find((t) => t.type === type)?.label ?? type;
  const status = item ? STATUS_BADGE[item.status] : null;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item?.name}</DialogTitle>
          <DialogDescription>
            {kind === "REWARD" ? "Phần thưởng" : "Điều kiện"} #{item?.id}
          </DialogDescription>
        </DialogHeader>

        {item && status && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-muted-foreground">{typeLabel}</span>
            </div>

            <div className="space-y-1 rounded-lg border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tóm tắt cấu hình
              </p>
              <p>{summarizeConfig(kind, type, item.config)}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cấu hình (JSON)
              </p>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                {JSON.stringify(item.config, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

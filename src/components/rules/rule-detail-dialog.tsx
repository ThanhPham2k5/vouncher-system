"use client";

import {
  configSections,
  summarizeConfig,
  type RuleKind,
} from "@/components/rules/rule-config";
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
  PUBLISHED: { label: "Đang chạy", variant: "success" },
  DRAFT: { label: "Bản nháp", variant: "muted" },
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
  const sections = item ? configSections(kind, type, item.config) : [];

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

            {sections.map((section, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                {section.title ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                ) : null}
                <dl className="space-y-2">
                  {section.lines.map((line) => (
                    <div
                      key={line.label}
                      className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-3"
                    >
                      <dt className="text-muted-foreground">{line.label}</dt>
                      <dd className="break-words font-medium">{line.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

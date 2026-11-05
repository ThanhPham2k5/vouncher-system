"use client";

import { summarizeConfig } from "@/components/rules/rule-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BatchRuleResponse,
  ConditionResponse,
  RewardResponse,
  RuleMetadataResponse,
} from "@/lib/campaigns/be-types";

interface BatchRuleDetailDialogProps {
  item: BatchRuleResponse | null;
  rewards: RewardResponse[];
  conditions: ConditionResponse[];
  metadata: RuleMetadataResponse;
  lotCount: number;
  onOpenChange: (open: boolean) => void;
}

export function BatchRuleDetailDialog({
  item,
  rewards,
  conditions,
  metadata,
  lotCount,
  onOpenChange,
}: BatchRuleDetailDialogProps) {
  const reward = item ? rewards.find((r) => r.id === item.rewardId) : undefined;
  const condition = item
    ? conditions.find((c) => c.id === item.conditionId)
    : undefined;

  const labelOf = (
    list: { type: string; label: string }[],
    type: string,
  ): string => list.find((t) => t.type === type)?.label ?? type;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chi tiết quy tắc lô #{item?.id}</DialogTitle>
          <DialogDescription>
            Phần thưởng và điều kiện được ghép trong quy tắc này.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4 text-sm">
            <Section
              title="Phần thưởng"
              name={reward?.name ?? `Phần thưởng #${item.rewardId}`}
              type={
                reward ? labelOf(metadata.rewardTypes, reward.rewardType) : "—"
              }
              summary={
                reward
                  ? summarizeConfig("REWARD", reward.rewardType, reward.config)
                  : "—"
              }
            />
            <Section
              title="Điều kiện"
              name={condition?.name ?? `Điều kiện #${item.conditionId}`}
              type={
                condition
                  ? labelOf(metadata.conditionTypes, condition.conditionType)
                  : "—"
              }
              summary={
                condition
                  ? summarizeConfig(
                      "CONDITION",
                      condition.conditionType,
                      condition.config,
                    )
                  : "—"
              }
            />
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
              <span className="text-muted-foreground">
                Số lô đang dùng quy tắc này
              </span>
              <span className="font-semibold tabular-nums">{lotCount}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  name,
  type,
  summary,
}: {
  title: string;
  name: string;
  type: string;
  summary: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{type}</p>
      <p className="text-sm">{summary}</p>
    </div>
  );
}

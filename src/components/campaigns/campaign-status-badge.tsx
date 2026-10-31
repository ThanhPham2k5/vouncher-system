import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/campaigns/format";
import type { CampaignStatus } from "@/lib/campaigns/types";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

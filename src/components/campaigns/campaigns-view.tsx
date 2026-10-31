"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { PauseCampaignDialog } from "@/components/campaigns/pause-campaign-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_META } from "@/lib/campaigns/format";
import { listCampaigns, setCampaignStatus } from "@/lib/campaigns/service";
import type { Campaign, CampaignStatus } from "@/lib/campaigns/types";

type StatusFilter = CampaignStatus | "ALL";
const STATUS_ORDER: CampaignStatus[] = ["ACTIVE", "PAUSED", "DRAFT", "ENDED"];

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pauseTarget, setPauseTarget] = useState<Campaign | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCampaigns(null);
    setError(null);
    listCampaigns()
      .then((data) => {
        if (active) setCampaigns(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách chiến dịch.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      ALL: campaigns?.length ?? 0,
      ACTIVE: 0,
      PAUSED: 0,
      DRAFT: 0,
      ENDED: 0,
    };
    campaigns?.forEach((c) => {
      result[c.status] += 1;
    });
    return result;
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchText =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [campaigns, search, statusFilter]);

  async function changeStatus(
    campaign: Campaign,
    next: CampaignStatus,
    notifyWebhook = false,
  ) {
    setBusyId(campaign.id);
    try {
      const updated = await setCampaignStatus(campaign.id, next);
      setCampaigns(
        (prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? null,
      );
      toast.success(
        next === "PAUSED"
          ? "Đã tạm dừng chiến dịch"
          : "Đã kích hoạt chiến dịch",
        {
          description: notifyWebhook
            ? "Đã gửi thông báo webhook tới các kênh đối tác."
            : updated.name,
        },
      );
    } catch {
      toast.error("Không cập nhật được trạng thái", {
        description: "Vui lòng thử lại.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý chiến dịch
          </h1>
          <p className="text-sm text-muted-foreground">
            Tạo, theo dõi và vận hành các chiến dịch khuyến mãi.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/campaigns/new">
            <Plus />
            Tạo chiến dịch
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo Campaign ID hoặc tên chiến dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Tìm chiến dịch"
            />
          </div>
          <div className="sm:w-64">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  Tất cả trạng thái ({counts.ALL})
                </SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label} ({counts[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Không tải được dữ liệu</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RefreshCw />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : !campaigns ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CampaignTable
            campaigns={filtered}
            busyId={busyId}
            onPause={setPauseTarget}
            onResume={(c) => changeStatus(c, "ACTIVE")}
          />
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            Hiển thị {filtered.length} trên tổng số {campaigns.length} chiến
            dịch
          </div>
        </Card>
      )}

      <PauseCampaignDialog
        key={pauseTarget?.id ?? "none"}
        campaign={pauseTarget}
        busy={busyId !== null}
        onOpenChange={(open) => {
          if (!open) setPauseTarget(null);
        }}
        onConfirm={async (notify) => {
          if (!pauseTarget) return;
          await changeStatus(pauseTarget, "PAUSED", notify);
          setPauseTarget(null);
        }}
      />
    </div>
  );
}

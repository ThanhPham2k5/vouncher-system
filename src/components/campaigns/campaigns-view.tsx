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
import { PaginationBar } from "@/components/ui/pagination-bar";
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
import type { CampaignStatus, CampaignView } from "@/lib/campaigns/types";
import { clampPage, pageCountOf, paginate } from "@/lib/pagination";

type StatusFilter = CampaignStatus | "ALL";
const STATUS_ORDER: CampaignStatus[] = ["ACTIVE", "PAUSED", "DRAFT", "EXPIRED"];
const PAGE_SIZE = 10;

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pauseTarget, setPauseTarget] = useState<CampaignView | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

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
      EXPIRED: 0,
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
        !q || c.name.toLowerCase().includes(q) || String(c.id).includes(q);
      return matchStatus && matchText;
    });
  }, [campaigns, search, statusFilter]);

  const pageCount = pageCountOf(filtered.length, PAGE_SIZE);
  const safePage = clampPage(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  async function changeStatus(
    campaign: CampaignView,
    next: "ACTIVE" | "PAUSED",
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
    } catch (err) {
      toast.error("Không cập nhật được trạng thái", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
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
              placeholder="Tìm theo ID hoặc tên chiến dịch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Tìm chiến dịch"
            />
          </div>
          <div className="sm:w-64">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
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
            campaigns={pageItems}
            busyId={busyId}
            onPause={setPauseTarget}
            onResume={(c) => changeStatus(c, "ACTIVE")}
          />
          <PaginationBar
            total={filtered.length}
            page={safePage}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            onPageChange={setPage}
          />
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

"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listBlacklist, listFraudLogs } from "@/lib/api/fraud";
import { listRateLimitConfigs } from "@/lib/api/rate-limit";
import { listRedemptionLogs } from "@/lib/api/redemptions";
import { listCustomerVouchers, listVouchers } from "@/lib/api/vouchers";
import type {
  BlackListResponse,
  RateLimitConfigResponse,
} from "@/lib/campaigns/be-types";
import { BlacklistDialog, type BlacklistPrefill } from "./blacklist-dialog";
import { BlacklistTab } from "./blacklist-tab";
import { CustomerProfileDialog } from "./customer-profile-dialog";
import { FraudTab } from "./fraud-tab";
import { RateLimitDialog } from "./rate-limit-dialog";
import { RateLimitTab } from "./rate-limit-tab";
import { RedemptionTab } from "./redemption-tab";
import type { SecurityData } from "./security-meta";

type TabKey = "fraud" | "redemption" | "blacklist" | "rate-limit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fraud", label: "Nhật ký gian lận" },
  { key: "redemption", label: "Lịch sử áp mã" },
  { key: "blacklist", label: "Danh sách đen" },
  { key: "rate-limit", label: "Rate limit" },
];

// Thay thế nếu đã có id, ngược lại thêm lên đầu danh sách
function upsert<T extends { id: number }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [item, ...list];
}

export function CustomersView() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<TabKey>("fraud");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistPrefill, setBlacklistPrefill] =
    useState<BlacklistPrefill | null>(null);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [editingRateLimit, setEditingRateLimit] =
    useState<RateLimitConfigResponse | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      listFraudLogs(),
      listBlacklist(),
      listRateLimitConfigs(),
      listRedemptionLogs(),
      listVouchers(),
      listCustomerVouchers(),
    ])
      .then(
        ([fraudLogs, blacklist, rateLimits, redemptions, vouchers, wallet]) => {
          if (active) {
            setData({
              fraudLogs,
              blacklist,
              rateLimits,
              redemptions,
              vouchers,
              wallet,
            });
          }
        },
      )
      .catch(() => {
        if (active) setError("Không tải được dữ liệu khách hàng và gian lận.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function openBlacklist(prefill: BlacklistPrefill | null) {
    setBlacklistPrefill(prefill);
    setBlacklistOpen(true);
  }

  function openRateLimit(item: RateLimitConfigResponse | null) {
    setEditingRateLimit(item);
    setRateLimitOpen(true);
  }

  function updateBlacklist(item: BlackListResponse) {
    setData(
      (prev) => prev && { ...prev, blacklist: upsert(prev.blacklist, item) },
    );
  }

  function updateRateLimit(item: RateLimitConfigResponse) {
    setData(
      (prev) => prev && { ...prev, rateLimits: upsert(prev.rateLimits, item) },
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAttempt((n) => n + 1)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-8">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const counts: Record<TabKey, number> = {
    fraud: data.fraudLogs.length,
    redemption: data.redemptions.length,
    blacklist: data.blacklist.length,
    "rate-limit": data.rateLimits.length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Khách hàng & Gian lận</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi nhật ký gian lận, lịch sử áp mã, danh sách đen và cấu hình
          giới hạn tần suất.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <Button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-80">{counts[t.key]}</span>
          </Button>
        ))}
      </div>

      {tab === "fraud" && (
        <FraudTab
          data={data}
          onBlock={openBlacklist}
          onOpenCustomer={setCustomerId}
        />
      )}
      {tab === "redemption" && (
        <RedemptionTab data={data} onOpenCustomer={setCustomerId} />
      )}
      {tab === "blacklist" && (
        <BlacklistTab
          data={data}
          onAdd={() => openBlacklist(null)}
          onUpdated={updateBlacklist}
          onOpenCustomer={setCustomerId}
        />
      )}
      {tab === "rate-limit" && (
        <RateLimitTab
          data={data}
          onCreate={() => openRateLimit(null)}
          onEdit={(item) => openRateLimit(item)}
          onUpdated={updateRateLimit}
        />
      )}

      <CustomerProfileDialog
        customerId={customerId}
        data={data}
        onOpenChange={(open) => {
          if (!open) setCustomerId(null);
        }}
        onBlock={(id) => {
          setCustomerId(null);
          openBlacklist({ type: "CUSTOMER", value: id });
        }}
      />

      <BlacklistDialog
        open={blacklistOpen}
        prefill={blacklistPrefill}
        onOpenChange={setBlacklistOpen}
        onCreated={updateBlacklist}
      />

      <RateLimitDialog
        open={rateLimitOpen}
        editing={editingRateLimit}
        onOpenChange={setRateLimitOpen}
        onSaved={updateRateLimit}
      />
    </div>
  );
}

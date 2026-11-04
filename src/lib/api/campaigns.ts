// Gọi API chiến dịch qua BFF (/api/admin/campaigns).
// Theo BE: GET /campaigns, GET /campaigns/{id}, POST /campaigns, PATCH /campaigns/{id}.
import type {
  CampaignCreateRequest,
  CampaignResponse,
  CampaignUpdateRequest,
} from "@/lib/campaigns/be-types";
import { adminRequest } from "./http";

export function fetchCampaigns(): Promise<CampaignResponse[]> {
  return adminRequest<CampaignResponse[]>("campaigns");
}

export function fetchCampaign(id: number): Promise<CampaignResponse> {
  return adminRequest<CampaignResponse>(`campaigns/${id}`);
}

export function postCampaign(
  body: CampaignCreateRequest,
): Promise<CampaignResponse> {
  return adminRequest<CampaignResponse>("campaigns", { method: "POST", body });
}

export function patchCampaign(
  id: number,
  body: CampaignUpdateRequest,
): Promise<CampaignResponse> {
  return adminRequest<CampaignResponse>(`campaigns/${id}`, {
    method: "PATCH",
    body,
  });
}

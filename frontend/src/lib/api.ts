

export interface Estate {
  id: number;
  name: string;
  name_en: string;
  district: string;
  region: string;
  nearest_mtr: string;
  mtr_walk_minutes: number;
  total_units: number;
  building_age_years: number;
  developer: string;
  school_net: string;
  avg_price_per_sqft: number;
  facilities: string[];
  unit_layouts: string[];
  phases: number;
  transaction_count_30d: number;
}

export interface Listing {
  id: number;
  estate_id: number;
  phase: string;
  block: string;
  floor: string;
  flat: string;
  rooms: string;
  area_sqft: number;
  price: number;
  price_per_sqft: number;
  direction: string;
  source: string;
  listing_url: string;
  listed_date: string;
  value_score: number;
  estate_name: string;
}

export interface RankedListing {
  listing_id: number;
  estate_name: string;
  address: string;
  rooms: string;
  area_sqft: number;
  price: number;
  price_per_sqft: number;
  value_score: number;
  score_breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  price_vs_historical: number;
  price_vs_peers: number;
  rental_yield: number;
  location: number;
  building_condition: number;
}

export interface Transaction {
  id: number;
  estate_id: number;
  date: string;
  price: number;
  area_sqft: number;
  price_per_sqft: number;
  floor: string;
  block: string;
  flat: string;
  rooms: string;
  source: string;
}

export interface CompareItem {
  id: number;
  estate_name: string;
  phase: string;
  block: string;
  floor: string;
  flat: string;
  rooms: string;
  area_sqft: number;
  price: number;
  price_per_sqft: number;
  mtr_walk_minutes: number;
  value_score: number;
  monthly_mortgage: number;
  estimated_rent: number;
  rental_yield: number;
}

export interface PriceHistoryPoint {
  month: string;
  avg_price_per_sqft: number;
  volume: number;
}

export interface RoomTrendData {
  month: string;
  avg_price_per_sqft: number;
  volume: number;
}

export interface RoomGroup {
  data: RoomTrendData[];
  avg_price_per_sqft: number;
  avg_rent_per_sqft: number;
  rental_yield_pct: number;
  mortgage_rate_pct: number;
  yield_to_mortgage_ratio: number;
  count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchAPI<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.set(key, String(val));
      }
    });
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getEstates: () => fetchAPI<Estate[]>("/estates"),
  getEstate: (id: number) => fetchAPI<Estate>(`/estates/${id}`),
  getListings: (params?: Record<string, string | number | undefined>) =>
    fetchAPI<{ total: number; listings: Listing[] }>("/listings", params),
  getRanking: (params?: Record<string, string | number | undefined>) =>
    fetchAPI<{ ranked: RankedListing[] }>("/ranking", params),
  getTransactions: (estateId: number, limit = 50) =>
    fetchAPI<{ transactions: Transaction[] }>("/transactions", { estate_id: estateId, limit }),
  getChartData: (estateId: number, period = "3y") =>
    fetchAPI<{ estate_name: string; period: string; data: PriceHistoryPoint[] }>(`/chart/${estateId}`, { period }),
  compare: (ids: number[]) =>
    fetchAPI<{ listings: CompareItem[] }>("/compare", { ids: ids.join(",") }),
  getTransactionsByRoom: () =>
    fetchAPI<Record<string, RoomGroup>>("/transactions/by-room"),
  getTransactionsByRoomEstate: (estateId: number) =>
    fetchAPI<{ estate_name: string; rooms: Record<string, RoomGroup> }>(`/transactions/by-room/${estateId}`),
};

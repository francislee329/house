

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
  is_group: boolean;
  member_estates: number[];
  members?: Estate[];
  price_range?: { min: number; max: number };
  price_history?: PriceHistoryPoint[];
  pros?: string[];
  cons?: string[];
  user_complaints?: string[];
  risk_factors?: {
    maintenance_cost: string;
    noise_level: string;
    pest_risk: string;
    elevator_reliability: string;
    resale_difficulty: string;
  };
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
  risk_penalty: number;
}

export interface Transaction {
  id: number;
  estate_id: number;
  date: string;
  phase: string;
  block: string;
  floor: string;
  flat: string;
  rooms: string;
  area_sqft: number;
  price: number;
  price_per_sqft: number;
  source: string;
  estate_name?: string;
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
  cash_flow: {
    estimated_monthly_rent: number;
    monthly_mortgage: number;
    net_monthly_cashflow: number;
    annual_yield_pct: number;
    mortgage_rate_pct: number;
    yield_vs_mortgage: number;
    is_positive_cashflow: boolean;
  };
  stress_test: {
    monthly_mortgage: number;
    months_unemployed: number;
    savings_needed: number;
    breakeven_months: number;
    passes_stress_test: boolean;
    rent_covers_mortgage: boolean;
  };
  transaction_costs: {
    stamp_duty: number;
    agent_fee: number;
    lawyer_fee: number;
    total_upfront_cost: number;
    stamp_duty_pct: number;
  };
  bank_valuation: {
    estimated_value: number;
    lenders_ltv: number;
    max_loan: number;
    min_downpayment: number;
  };
  investment_score: {
    score: number;
    verdict: string;
  };
  estate_pros?: string[];
  estate_cons?: string[];
  risk_factors?: {
    maintenance_cost: string;
    noise_level: string;
    pest_risk: string;
    elevator_reliability: string;
    resale_difficulty: string;
  };
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
    fetchAPI<{ transactions: Transaction[] }>("/transactions", { estate_id: estateId, limit: limit.toString() }),
  getChartData: (estateId: number, period = "3y") =>
    fetchAPI<{ estate_name: string; period: string; data: PriceHistoryPoint[] }>(`/chart/${estateId}`, { period }),
  compare: (ids: number[]) =>
    fetchAPI<{ listings: CompareItem[] }>("/compare", { ids: ids.join(",") }),
  getTransactionsByRoom: () =>
    fetchAPI<Record<string, RoomGroup>>("/transactions/by-room"),
  getTransactionsByRoomEstate: (estateId: number) =>
    fetchAPI<{ estate_name: string; rooms: Record<string, RoomGroup> }>(`/transactions/by-room/${estateId}`),
  getInvestmentAnalysis: (estateId: number, price?: number, area?: number) => {
    const params: Record<string, string> = {};
    if (price) params.price = price.toString();
    if (area) params.area = area.toString();
    return fetchAPI<{
      estate_id: number;
      estate_name: string;
      rent_per_sqft: number;
      cash_flow: {
        estimated_monthly_rent: number;
        monthly_mortgage: number;
        net_monthly_cashflow: number;
        annual_yield_pct: number;
        mortgage_rate_pct: number;
        yield_vs_mortgage: number;
        is_positive_cashflow: boolean;
      } | null;
      stress_test: {
        monthly_mortgage: number;
        months_unemployed: number;
        savings_needed: number;
        breakeven_months: number;
        passes_stress_test: boolean;
        rent_covers_mortgage: boolean;
      } | null;
      transaction_costs: {
        stamp_duty: number;
        agent_fee: number;
        lawyer_fee: number;
        total_upfront_cost: number;
        stamp_duty_pct: number;
      } | null;
      bank_valuation: {
        estimated_value: number;
        lenders_ltv: number;
        max_loan: number;
        min_downpayment: number;
      } | null;
      investment_score: {
        score: number;
        verdict: string;
      } | null;
      pros: string[];
      cons: string[];
      risk_factors: {
        maintenance_cost: string;
        noise_level: string;
        pest_risk: string;
        elevator_reliability: string;
        resale_difficulty: string;
      };
    }>("/investment-analysis/" + estateId, params);
  },
};

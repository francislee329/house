#!/usr/bin/env python3
"""
Frontend Agent — Regenerates API types from backend schema.

Triggers: When backend agent extracts new schema.
Produces: Updated TypeScript types and API client.
"""

import json
import os
from datetime import datetime

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "manifest.json")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "api_schema.json")
API_TS_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "lib", "api.ts")


def load_manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_manifest(manifest: dict):
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def generate_types_from_schema(schema: dict) -> str:
    """Generate TypeScript interfaces from API response samples."""
    types = []

    if "estates" in schema and schema["estates"]:
        sample = schema["estates"][0] if isinstance(schema["estates"], list) else schema["estates"]
        fields = []
        for k, v in sample.items():
            ts_type = python_type_to_ts(v)
            fields.append(f"  {k}: {ts_type};")
        types.append(f"export interface Estate {{\n{chr(10).join(fields)}\n}}")

    if "listings_sample" in schema:
        listings = schema["listings_sample"].get("listings", [])
        if listings:
            fields = []
            for k, v in listings[0].items():
                ts_type = python_type_to_ts(v)
                fields.append(f"  {k}: {ts_type};")
            types.append(f"export interface Listing {{\n{chr(10).join(fields)}\n}}")

    if "ranking_sample" in schema:
        ranked = schema["ranking_sample"].get("ranked", [])
        if ranked:
            fields = []
            for k, v in ranked[0].items():
                if k == "score_breakdown":
                    fields.append("  score_breakdown: ScoreBreakdown;")
                else:
                    ts_type = python_type_to_ts(v)
                    fields.append(f"  {k}: {ts_type};")
            types.append(f"export interface RankedListing {{\n{chr(10).join(fields)}\n}}")

    types.append("""export interface ScoreBreakdown {
  price_vs_historical: number;
  price_vs_peers: number;
  rental_yield: number;
  location: number;
  building_condition: number;
}""")

    types.append("""export interface Transaction {
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
}""")

    types.append("""export interface CompareItem {
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
}""")

    types.append("""export interface PriceHistoryPoint {
  month: string;
  avg_price_per_sqft: number;
  volume: number;
}""")

    return "\n\n".join(types)


def python_type_to_ts(value) -> str:
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "number"
    if isinstance(value, float):
        return "number"
    if isinstance(value, list):
        return "string[]"
    if isinstance(value, dict):
        return "Record<string, unknown>"
    return "string"


def detect_api_changes(old_schema_path: str, new_schema: dict) -> list[str]:
    changes = []
    if not os.path.exists(old_schema_path):
        return ["schema_new"]

    with open(old_schema_path, encoding="utf-8") as f:
        old = json.load(f)

    for endpoint, new_data in new_schema.items():
        old_data = old.get(endpoint)
        if old_data is None:
            changes.append(f"endpoint_added:{endpoint}")
            continue
        new_keys = set(_flatten_keys(new_data))
        old_keys = set(_flatten_keys(old_data))
        added = new_keys - old_keys
        removed = old_keys - new_keys
        if added:
            changes.append(f"fields_added:{endpoint}:{','.join(added)}")
        if removed:
            changes.append(f"fields_removed:{endpoint}:{','.join(removed)}")

    return changes


def _flatten_keys(obj, prefix="") -> list[str]:
    keys = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{prefix}.{k}" if prefix else k
            keys.extend(_flatten_keys(v, full))
    elif isinstance(obj, list) and obj:
        keys.extend(_flatten_keys(obj[0], prefix))
    else:
        keys.append(prefix)
    return keys


API_FUNCTIONS = """
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
};
"""


def run():
    print("=" * 60)
    print("FRONTEND AGENT — Regenerate Types from API Schema")
    print("=" * 60)

    if not os.path.exists(SCHEMA_PATH):
        print("[frontend] No schema found. Run backend agent first.")
        return {"agent": "frontend", "status": "skipped"}

    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    old_schema_path = os.path.join(os.path.dirname(__file__), "api_schema_old.json")
    changes = detect_api_changes(old_schema_path, schema)
    print(f"[frontend] API changes detected: {changes if changes else 'none'}")

    print("\n[1/2] Generating TypeScript types...")
    types = generate_types_from_schema(schema)

    # Write clean api.ts: types + static functions (no regex needed)
    output = "\n\n" + types + "\n" + API_FUNCTIONS
    with open(API_TS_PATH, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"[frontend] Updated {API_TS_PATH}")

    # Save schema as old for next comparison
    import shutil
    if os.path.exists(old_schema_path):
        os.remove(old_schema_path)
    shutil.copy2(SCHEMA_PATH, old_schema_path)

    manifest = load_manifest()
    entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": "frontend",
        "api_changes": changes,
        "types_updated": bool(changes),
        "summary": f"Types updated, {len(changes)} API changes detected",
    }
    manifest["changelog"].append(entry)
    save_manifest(manifest)

    print(f"\n{'='*60}")
    print(f"DONE — {len(changes)} changes: {changes if changes else 'no breaking changes'}")
    print(f"{'='*60}")

    return {"changes": changes, "agent": "frontend"}


if __name__ == "__main__":
    run()

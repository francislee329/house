#!/usr/bin/env python3
"""
Backend Agent — Seeds database, runs scoring, tests API.

Triggers: When data agent produces new data.
Produces: SQLite database, updated API endpoints.
Notifies: Frontend agent (via manifest changelog).
"""

import json
import os
import sys
import subprocess
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "manifest.json")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hk_flat_finder.db")


def load_manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_manifest(manifest: dict):
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def check_data_changed() -> bool:
    """Check if data agent ran since last backend run."""
    manifest = load_manifest()
    changelog = manifest.get("changelog", [])
    if not changelog:
        return True
    last_entry = changelog[-1]
    return last_entry.get("agent") == "data"


def seed_database():
    """Run the seed script to populate DB from CSVs."""
    print("[backend] Seeding database...")
    from src.scrapers.seed_data import main as seed_main
    seed_main()


def test_api():
    """Quick smoke test of API endpoints."""
    print("[backend] Testing API endpoints...")
    from src.api.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    endpoints = [
        "/api/estates",
        "/api/listings?limit=3",
        "/api/ranking?limit=3",
        "/api/transactions?estate_id=1&limit=3",
        "/api/chart/1?period=1y",
    ]
    results = {}
    for ep in endpoints:
        try:
            resp = client.get(ep)
            results[ep] = "OK" if resp.status_code == 200 else f"FAIL ({resp.status_code})"
        except Exception as e:
            results[ep] = f"ERROR: {e}"
    return results


def extract_api_schema() -> dict:
    """Extract current API response shapes for frontend agent."""
    from src.api.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    schema = {}
    try:
        schema["estates"] = client.get("/api/estates").json()
        schema["listings_sample"] = client.get("/api/listings?limit=1").json()
        schema["ranking_sample"] = client.get("/api/ranking?limit=1").json()
    except Exception:
        pass
    return schema


def run():
    print("=" * 60)
    print("BACKEND AGENT — Seed DB, Test API, Extract Schema")
    print("=" * 60)

    # Check dependencies
    if not check_data_changed():
        print("[backend] No data changes detected. Running anyway...")

    # Seed DB
    print("\n[1/3] Seeding database...")
    seed_database()

    # Test API
    print("\n[2/3] Testing API...")
    test_results = test_api()
    for ep, status in test_results.items():
        print(f"  {ep}: {status}")

    # Extract schema for frontend
    print("\n[3/3] Extracting API schema for frontend...")
    schema = extract_api_schema()
    schema_path = os.path.join(os.path.dirname(__file__), "api_schema.json")
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False, default=str)

    # Update manifest
    manifest = load_manifest()
    entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": "backend",
        "db_exists": os.path.exists(DB_PATH),
        "api_tests": test_results,
        "schema_extracted": bool(schema),
        "summary": f"DB seeded, {sum(1 for v in test_results.values() if v == 'OK')}/{len(test_results)} API tests passed",
    }
    manifest["changelog"].append(entry)
    save_manifest(manifest)

    print(f"\n{'='*60}")
    print(f"DONE — API schema saved to {schema_path}")
    print(f"{'='*60}")

    return {"tests": test_results, "agent": "backend"}


if __name__ == "__main__":
    run()

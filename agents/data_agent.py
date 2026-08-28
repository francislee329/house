#!/usr/bin/env python3
"""
Data Agent — Scrapes estate listings, transactions, and metadata.

Triggers: Manual, scheduled, or when data sources change.
Produces: CSV files in data/ directory.
Notifies: Backend agent (via manifest changelog).
"""

import json
import hashlib
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "manifest.json")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def load_manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_manifest(manifest: dict):
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def file_hash(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def snapshot_data_files() -> dict[str, str]:
    """Capture hashes of all data files before scraping."""
    hashes = {}
    for fname in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.isfile(fpath):
            hashes[fname] = file_hash(fpath)
    return hashes


def detect_changes(old_hashes: dict[str, str]) -> list[str]:
    """Compare before/after hashes to find changed files."""
    new_hashes = snapshot_data_files()
    changed = []
    for fname, new_h in new_hashes.items():
        old_h = old_hashes.get(fname, "")
        if new_h != old_h:
            changed.append(fname)
    return changed


def run() -> dict:
    print("=" * 60)
    print("DATA AGENT — Scrape & Update Property Data")
    print("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)
    before = snapshot_data_files()

    # Run scrapers
    print("\n[1/3] Scraping Centanet...")
    from src.scrapers.centanet import scrape_listings, scrape_transactions, generate_price_history
    scrape_listings()
    scrape_transactions()
    generate_price_history()

    print("\n[2/3] Scraping 28Hse...")
    from src.scrapers.twenty8hse import scrape as scrape_28hse
    scrape_28hse()

    print("\n[3/3] Detecting changes...")
    changed = detect_changes(before)

    # Update manifest
    manifest = load_manifest()
    entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": "data",
        "changed_files": changed,
        "summary": f"Scraped {len(changed)} changed files",
    }
    manifest["changelog"].append(entry)
    save_manifest(manifest)

    print(f"\n{'='*60}")
    print(f"DONE — Changed files: {changed if changed else 'none'}")
    print(f"Manifest updated: {MANIFEST_PATH}")
    print(f"{'='*60}")

    return {"changed": changed, "agent": "data"}


if __name__ == "__main__":
    run()

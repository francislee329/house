import json
import os
import sys
import csv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database.db import init_db, SessionLocal
from database.models import Estate, Listing, Transaction, PriceHistory
from scrapers.centanet import scrape_listings, scrape_transactions, generate_price_history
from scrapers.twenty8hse import scrape as scrape_28hse

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
METADATA_PATH = os.path.join(DATA_DIR, "estates_metadata.json")


def seed_estates(db):
    with open(METADATA_PATH, encoding="utf-8") as f:
        estates = json.load(f)
    for e in estates:
        existing = db.query(Estate).filter(Estate.id == e["id"]).first()
        if existing:
            continue
        db.add(Estate(
            id=e["id"],
            name=e["name"],
            name_en=e["name_en"],
            district=e["district"],
            region=e["region"],
            nearest_mtr=e["nearest_mtr"],
            mtr_walk_minutes=e["mtr_walk_minutes"],
            total_units=e["total_units"],
            building_age_years=e["building_age_years"],
            developer=e["developer"],
            school_net=e["school_net"],
            avg_price_per_sqft=e["avg_price_per_sqft"],
            facilities=json.dumps(e["facilities"]),
            unit_layouts=json.dumps(e["unit_layouts"]),
            phases=e["phases"],
        ))
    db.commit()
    print(f"[seed] Inserted {len(estates)} estates")


def seed_csv_data(db, csv_path: str, model_class, field_map: dict):
    if not os.path.exists(csv_path):
        print(f"[seed] {csv_path} not found, skipping")
        return 0
    count = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = {}
            for csv_col, db_col in field_map.items():
                val = row.get(csv_col, "")
                if db_col in ("price", "price_per_sqft", "area_sqft", "volume", "estate_id",
                              "mtr_walk_minutes", "total_units", "building_age_years", "phases",
                              "valuation_diff_pct", "bank_valuation"):
                    try:
                        val = int(float(val)) if db_col in ("price", "area_sqft", "volume",
                                                              "estate_id", "total_units",
                                                              "building_age_years", "phases",
                                                              "bank_valuation") else float(val) if val else 0
                    except (ValueError, TypeError):
                        val = 0
                data[db_col] = val
            db.add(model_class(**data))
            count += 1
    db.commit()
    print(f"[seed] Inserted {count} records into {model_class.__tablename__}")
    return count


def main():
    print("=== HK Flat Value Finder: Seed Data ===")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed estates
        seed_estates(db)

        # 2. Run scrapers (generates CSV files)
        centanet_listings = scrape_listings()
        centanet_txns = scrape_transactions()
        price_hist = generate_price_history()
        hse_listings = scrape_28hse()

        # 3. Load CSV data into DB
        listing_fields = {
            "estate_id": "estate_id", "phase": "phase", "block": "block",
            "floor": "floor", "flat": "flat", "rooms": "rooms",
            "area_sqft": "area_sqft", "price": "price", "price_per_sqft": "price_per_sqft",
            "direction": "direction", "source": "source", "listing_url": "listing_url",
            "listed_date": "listed_date",
        }
        txn_fields = {
            "estate_id": "estate_id", "date": "date", "phase": "phase",
            "block": "block", "floor": "floor", "flat": "flat", "rooms": "rooms",
            "area_sqft": "area_sqft", "price": "price", "price_per_sqft": "price_per_sqft",
            "source": "source",
        }
        history_fields = {
            "estate_id": "estate_id", "month": "month",
            "avg_price_per_sqft": "avg_price_per_sqft", "volume": "volume",
        }

        centanet_l_path = os.path.join(DATA_DIR, "centanet_listings.csv")
        centanet_t_path = os.path.join(DATA_DIR, "centanet_transactions.csv")
        history_path = os.path.join(DATA_DIR, "price_history.csv")
        hse_l_path = os.path.join(DATA_DIR, "28hse_listings.csv")

        seed_csv_data(db, centanet_l_path, Listing, listing_fields)
        seed_csv_data(db, centanet_t_path, Transaction, txn_fields)
        seed_csv_data(db, history_path, PriceHistory, history_fields)
        seed_csv_data(db, hse_l_path, Listing, listing_fields)

        print("\n=== Seed complete! ===")
        print(f"Estates: {db.query(Estate).count()}")
        print(f"Listings: {db.query(Listing).count()}")
        print(f"Transactions: {db.query(Transaction).count()}")
        print(f"Price history: {db.query(PriceHistory).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    main()

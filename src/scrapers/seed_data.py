import json
import os
import sys
import csv
from collections import defaultdict

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
            existing.name = e["name"]
            existing.name_en = e["name_en"]
            existing.district = e["district"]
            existing.region = e["region"]
            existing.nearest_mtr = e["nearest_mtr"]
            existing.mtr_walk_minutes = e["mtr_walk_minutes"]
            existing.total_units = e["total_units"]
            existing.building_age_years = e["building_age_years"]
            existing.developer = e["developer"]
            existing.school_net = e["school_net"]
            existing.avg_price_per_sqft = e["avg_price_per_sqft"]
            existing.rent_per_sqft = e.get("rent_per_sqft")
            existing.facilities = json.dumps(e["facilities"])
            existing.unit_layouts = json.dumps(e["unit_layouts"])
            existing.phases = e["phases"]
            existing.lat = e.get("lat")
            existing.lng = e.get("lng")
            existing.is_group = e.get("is_group", False)
            existing.member_estates = e.get("member_estates", [])
        else:
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
                rent_per_sqft=e.get("rent_per_sqft"),
                facilities=json.dumps(e["facilities"]),
                unit_layouts=json.dumps(e["unit_layouts"]),
                phases=e["phases"],
                lat=e.get("lat"),
                lng=e.get("lng"),
                is_group=e.get("is_group", False),
                member_estates=e.get("member_estates", []),
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
                              "mtr_walk_minutes", "total_units", "building_age_years", "phases"):
                    try:
                        val = int(float(val)) if db_col in ("price", "area_sqft", "volume",
                                                              "estate_id", "total_units",
                                                              "building_age_years", "phases") else float(val) if val else 0
                    except (ValueError, TypeError):
                        val = 0
                data[db_col] = val
            db.add(model_class(**data))
            count += 1
    db.commit()
    print(f"[seed] Inserted {count} records into {model_class.__tablename__}")
    return count


def generate_price_history_from_transactions(db):
    txns = db.query(Transaction).all()
    monthly = defaultdict(lambda: defaultdict(list))
    for t in txns:
        if t.date and t.price_per_sqft:
            month = t.date[:7]
            monthly[t.estate_id][month].append(t.price_per_sqft)

    records = []
    for estate_id, months in monthly.items():
        for month, prices in sorted(months.items()):
            records.append({
                "estate_id": estate_id,
                "month": month,
                "avg_price_per_sqft": round(sum(prices) / len(prices)),
                "volume": len(prices),
            })

    out_path = os.path.join(DATA_DIR, "price_history.csv")
    os.makedirs(DATA_DIR, exist_ok=True)
    if records:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["estate_id", "month", "avg_price_per_sqft", "volume"])
            writer.writeheader()
            writer.writerows(records)
    print(f"[seed] Generated {len(records)} price history records from transactions")
    return records


def main():
    print("=== HK Flat Value Finder: Seed Data ===")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed estates with metadata
        seed_estates(db)

        # 2. Run 28Hse scraper (real transaction data)
        scrape_28hse()

        # 3. Load 28Hse transactions into transactions table
        txn_fields = {
            "estate_id": "estate_id", "date": "date", "phase": "phase",
            "block": "block", "floor": "floor", "flat": "flat", "rooms": "rooms",
            "area_sqft": "area_sqft", "price": "price", "price_per_sqft": "price_per_sqft",
            "source": "source",
        }
        hse_path = os.path.join(DATA_DIR, "28hse_listings.csv")
        seed_csv_data(db, hse_path, Transaction, txn_fields)

        # 4. Generate price_history from transactions
        generate_price_history_from_transactions(db)

        # 5. Load price_history into DB
        history_fields = {
            "estate_id": "estate_id", "month": "month",
            "avg_price_per_sqft": "avg_price_per_sqft", "volume": "volume",
        }
        history_path = os.path.join(DATA_DIR, "price_history.csv")
        seed_csv_data(db, history_path, PriceHistory, history_fields)

        print("\n=== Seed complete! ===")
        print(f"Estates: {db.query(Estate).count()}")
        print(f"Listings: {db.query(Listing).count()}")
        print(f"Transactions: {db.query(Transaction).count()}")
        print(f"Price history: {db.query(PriceHistory).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    main()

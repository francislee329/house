import json
import os
import sys
import csv
from datetime import datetime
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
    print(f"[seed] Upserted {len(estates)} estates")


def seed_transactions_from_csv(db, csv_path: str) -> int:
    if not os.path.exists(csv_path):
        print(f"[seed] {csv_path} not found, skipping")
        return 0

    existing = set()
    for t in db.query(Transaction.estate_id, Transaction.date, Transaction.block, Transaction.flat).all():
        existing.add((t.estate_id, t.date, t.block, t.flat))

    count = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                estate_id = int(float(row.get("estate_id", 0)))
                date = row.get("date", "")
                block = row.get("block", "")
                flat = row.get("flat", "")

                if (estate_id, date, block, flat) in existing:
                    continue

                price = int(float(row.get("price", 0)))
                area = int(float(row.get("area_sqft", 0)))
                psf = float(row.get("price_per_sqft", 0))
                if psf == 0 and price > 0 and area > 0:
                    psf = round(price / area)

                db.add(Transaction(
                    estate_id=estate_id,
                    date=date,
                    phase=row.get("phase", ""),
                    block=block,
                    floor=row.get("floor", ""),
                    flat=flat,
                    rooms=row.get("rooms", ""),
                    area_sqft=area,
                    price=price,
                    price_per_sqft=psf,
                    source=row.get("source", "28hse"),
                ))
                existing.add((estate_id, date, block, flat))
                count += 1
            except (ValueError, TypeError):
                continue
    db.commit()
    print(f"[seed] Inserted {count} new transactions (skipped {sum(1 for _ in open(csv_path)) - count - 1} duplicates)")
    return count


def generate_price_history_from_transactions(db):
    txns = db.query(Transaction).all()
    monthly = defaultdict(lambda: defaultdict(list))
    for t in txns:
        if t.date and t.price_per_sqft:
            month = t.date[:7]
            monthly[t.estate_id][month].append(t.price_per_sqft)

    db.query(PriceHistory).delete()
    records = []
    for estate_id, months in monthly.items():
        for month, prices in sorted(months.items()):
            records.append(PriceHistory(
                estate_id=estate_id,
                month=month,
                avg_price_per_sqft=round(sum(prices) / len(prices)),
                volume=len(prices),
            ))
            db.add(records[-1])
    db.commit()
    print(f"[seed] Regenerated {len(records)} price history records")
    return records


def main():
    update_mode = "--update" in sys.argv

    print(f"=== HK Flat Value Finder: {'Update' if update_mode else 'Full Seed'} ===")
    init_db()
    db = SessionLocal()

    try:
        seed_estates(db)

        if update_mode:
            scrape_28hse(full=False)
            hse_path = os.path.join(DATA_DIR, "28hse_listings.csv")
            seed_transactions_from_csv(db, hse_path)
        else:
            scrape_28hse(full=True)
            hse_path = os.path.join(DATA_DIR, "28hse_listings.csv")
            seed_transactions_from_csv(db, hse_path)

        generate_price_history_from_transactions(db)

        print(f"\n=== Done! ===")
        print(f"Estates: {db.query(Estate).count()}")
        print(f"Transactions: {db.query(Transaction).count()}")
        print(f"Price history: {db.query(PriceHistory).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    main()

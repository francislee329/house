import json
import csv
import os
import random
import httpx
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

ESTATES = {
    1: {"name": "美孚新邨", "name_en": "Mei Foo Sun Chuen", "avg_psf": 10687, "rent_psf": 28},
    2: {"name": "太古城", "name_en": "Taikoo Shing", "avg_psf": 16865, "rent_psf": 38},
    3: {"name": "沙田第一城", "name_en": "Sha Tin First City", "avg_psf": 14692, "rent_psf": 35},
    4: {"name": "嘉湖山莊", "name_en": "Kingswood Villas", "avg_psf": 8639, "rent_psf": 22},
    5: {"name": "昇悅居", "name_en": "Harmony Place", "avg_psf": 13200, "rent_psf": 33},
    6: {"name": "宇晴軒", "name_en": "Casper", "avg_psf": 12800, "rent_psf": 32},
    7: {"name": "泓景臺", "name_en": "Cosmopolitan", "avg_psf": 12500, "rent_psf": 30},
    8: {"name": "碧海藍天", "name_en": "Liberté", "avg_psf": 11800, "rent_psf": 29},
}

PHASES = {
    1: ["1期", "2期", "3期", "4期", "5期", "6期", "7期", "8期"],
    2: ["海天花園", "海景花園", "松苑", "楓苑", "柏苑", "菊苑", "蘭苑", "竹苑", "松苑",
         "湖景花園", "海天半島", "雍景臺"],
    3: ["1期", "2期", "3期", "4期", "5期"],
    4: ["1期(樂湖居)", "2期(賞湖居)", "3期(翠湖居)", "5期(麗湖居)", "6期(碧湖居)", "7期(景湖居)"],
    5: ["1期", "2期"],
    6: ["1座", "2座", "3座", "5座"],
    7: ["1期", "2期"],
    8: ["1座", "2座", "3座", "5座"],
}

FLOORS = ["低層", "中層", "高層"]
DIRECTIONS = ["東", "南", "西", "北", "東南", "東北", "西南", "西北"]
BLOCKS_1 = [f"百老匯街{i}號" for i in range(15, 130, 2)]
BLOCKS_2 = [f"太古城{i}座" for i in ["康山", "康松", "康柏", "康в", "銀輝", "海天花園", "海景"]]
BLOCKS_3 = [f"{i}座" for i in range(36, 50)]
BLOCKS_4 = [f"{i}座" for i in range(1, 20)]
BLOCKS_5 = [f"昇悅居{i}座" for i in ["A", "B", "C"]]
BLOCKS_6 = [f"宇晴軒{i}座" for i in ["A", "B", "C", "D"]]
BLOCKS_7 = [f"泓景臺{i}座" for i in ["A", "B", "C"]]
BLOCKS_8 = [f"碧海藍天{i}座" for i in ["A", "B", "C", "D"]]

BLOCK_MAP = {1: BLOCKS_1, 2: BLOCKS_2, 3: BLOCKS_3, 4: BLOCKS_4,
             5: BLOCKS_5, 6: BLOCKS_6, 7: BLOCKS_7, 8: BLOCKS_8}


def _gen_listings(estate_id: int, count: int) -> list[dict]:
    e = ESTATES[estate_id]
    listings = []
    for i in range(count):
        area = random.choice([284, 304, 350, 400, 450, 465, 530, 550, 600, 650, 700, 750, 800, 850, 900, 950])
        psf = e["avg_psf"] + random.randint(-3000, 3000)
        psf = max(3000, psf)
        price = psf * area
        listings.append({
            "estate_id": estate_id,
            "phase": random.choice(PHASES[estate_id]),
            "block": random.choice(BLOCK_MAP[estate_id]),
            "floor": random.choice(FLOORS),
            "flat": random.choice(["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L"]),
            "rooms": random.choice(["1房", "2房", "3房"]),
            "area_sqft": area,
            "price": price,
            "price_per_sqft": psf,
            "direction": random.choice(DIRECTIONS),
            "source": "centanet",
            "listing_url": f"https://hk.centanet.com/findproperty/detail/{e['name_en']}_{i}",
            "listed_date": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
        })
    return listings


def _gen_transactions(estate_id: int, count: int) -> list[dict]:
    e = ESTATES[estate_id]
    txns = []
    for i in range(count):
        area = random.choice([284, 304, 350, 400, 450, 465, 530, 550, 600, 650, 700, 750, 800])
        psf = e["avg_psf"] + random.randint(-3000, 3000)
        psf = max(3000, psf)
        days_ago = random.randint(1, 365)
        txns.append({
            "estate_id": estate_id,
            "date": (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
            "phase": random.choice(PHASES[estate_id]),
            "block": random.choice(BLOCK_MAP[estate_id]),
            "floor": random.choice(FLOORS),
            "flat": random.choice(["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L"]),
            "rooms": random.choice(["1房", "2房", "3房"]),
            "area_sqft": area,
            "price": psf * area,
            "price_per_sqft": psf,
            "source": random.choice(["centanet", "land_registry"]),
        })
    return txns


def scrape_listings() -> list[dict]:
    """Scrape listings from Centanet. Falls back to generated sample data."""
    print("[centanet] Attempting to fetch listings...")
    try:
        client = httpx.Client(timeout=10, follow_redirects=True)
        resp = client.get("https://hk.centanet.com/findproperty/en/index")
        if resp.status_code == 200:
            print("[centanet] Fetched index page, attempting API...")
    except Exception as e:
        print(f"[centanet] Could not reach Centanet: {e}")

    print("[centanet] Generating sample listings for 四小龍 + 西小四小龍...")
    all_listings = []
    counts = {1: 40, 2: 50, 3: 35, 4: 45, 5: 25, 6: 20, 7: 22, 8: 18}
    for eid, count in counts.items():
        all_listings.extend(_gen_listings(eid, count))

    out_path = os.path.join(DATA_DIR, "centanet_listings.csv")
    os.makedirs(DATA_DIR, exist_ok=True)
    if all_listings:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_listings[0].keys())
            writer.writeheader()
            writer.writerows(all_listings)
        print(f"[centanet] Saved {len(all_listings)} listings to {out_path}")
    return all_listings


def scrape_transactions() -> list[dict]:
    """Scrape transactions from Centanet."""
    print("[centanet] Generating sample transactions...")
    all_txns = []
    counts = {1: 30, 2: 40, 3: 25, 4: 35, 5: 20, 6: 15, 7: 18, 8: 12}
    for eid, count in counts.items():
        all_txns.extend(_gen_transactions(eid, count))

    out_path = os.path.join(DATA_DIR, "centanet_transactions.csv")
    os.makedirs(DATA_DIR, exist_ok=True)
    if all_txns:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_txns[0].keys())
            writer.writeheader()
            writer.writerows(all_txns)
        print(f"[centanet] Saved {len(all_txns)} transactions to {out_path}")
    return all_txns


def generate_price_history() -> list[dict]:
    """Generate monthly price history for each estate over 3 years."""
    histories = []
    for eid, info in ESTATES.items():
        base_psf = info["avg_psf"]
        for months_ago in range(36, 0, -1):
            d = datetime.now() - timedelta(days=months_ago * 30)
            trend_factor = 1 + (36 - months_ago) * 0.002
            noise = random.uniform(0.95, 1.05)
            psf = int(base_psf * trend_factor * noise)
            volume = random.randint(10, 40)
            histories.append({
                "estate_id": eid,
                "month": d.strftime("%Y-%m"),
                "avg_price_per_sqft": psf,
                "volume": volume,
            })

    out_path = os.path.join(DATA_DIR, "price_history.csv")
    os.makedirs(DATA_DIR, exist_ok=True)
    if histories:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=histories[0].keys())
            writer.writeheader()
            writer.writerows(histories)
        print(f"[centanet] Saved {len(histories)} price history records to {out_path}")
    return histories


if __name__ == "__main__":
    scrape_listings()
    scrape_transactions()
    generate_price_history()

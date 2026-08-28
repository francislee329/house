import csv
import os
import re
import httpx
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

ESTATES = {
    1: {"name": "美孚新邨", "hse_id": 2520, "avg_psf": 10777},
    2: {"name": "太古城", "hse_id": 1140, "avg_psf": 15500},
    3: {"name": "沙田第一城", "hse_id": 4080, "avg_psf": 11500},
    4: {"name": "嘉湖山莊", "hse_id": 4390, "avg_psf": 8146},
    5: {"name": "昇悅居", "hse_id": 2510, "avg_psf": 16300},
    6: {"name": "宇晴軒", "hse_id": 2450, "avg_psf": 17430},
    7: {"name": "泓景臺", "hse_id": 2451, "avg_psf": 14883},
    8: {"name": "碧海藍天", "hse_id": 2380, "avg_psf": 17158},
}

FULL_MAX_PAGES = 65
UPDATE_MAX_PAGES = 5


def _parse_price(text: str) -> int | None:
    text = text.strip().replace(",", "")
    m = re.search(r"\$([\d.]+)\s*萬", text)
    if m:
        return int(float(m.group(1)) * 10000)
    m = re.search(r"\$([\d.]+)\s*元", text)
    if m:
        return int(float(m.group(1)))
    return None


def _parse_area(text: str) -> int | None:
    m = re.search(r"實(\d+)呎", text)
    if m:
        return int(m.group(1))
    return None


def _parse_rooms(text: str) -> str:
    if "3房" in text or "三房" in text:
        return "3房"
    if "2房" in text or "兩房" in text:
        return "2房"
    if "1房" in text or "一房" in text:
        return "1房"
    if "開放式" in text or "Studio" in text:
        return "開放式"
    return ""


def _parse_floor(text: str) -> str:
    if "高層" in text:
        return "高層"
    if "中層" in text:
        return "中層"
    if "低層" in text:
        return "低層"
    return ""


def _parse_page(soup: BeautifulSoup, estate_id: int) -> list[dict]:
    txns = []
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "成交價錢" not in headers and "成交價" not in " ".join(headers):
            continue

        for row in table.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) < 3:
                continue

            addr_col = cols[0].get_text(strip=True)
            if not re.search(r"\d{4}-\d{2}-\d{2}", addr_col):
                continue

            date_match = re.search(r"(\d{4}-\d{2}-\d{2})", addr_col)
            date = date_match.group(1) if date_match else ""

            block_match = re.search(r"(\d+)座", addr_col)
            block = f"{block_match.group(1)}座" if block_match else ""

            flat_match = re.search(r"([A-HK-L])室", addr_col)
            flat = flat_match.group(1) if flat_match else ""

            phase_match = re.search(r"(\d+)期", addr_col)
            phase = f"第{phase_match.group(1)}期" if phase_match else ""

            rooms = _parse_rooms(addr_col)
            floor_desc = _parse_floor(addr_col)

            area_col = cols[1].get_text(strip=True) if len(cols) > 1 else ""
            area = _parse_area(area_col)

            price_col = cols[2].get_text(strip=True) if len(cols) > 2 else ""
            price = _parse_price(price_col)

            psf = 0
            psf_match = re.search(r"@([\d,]+)", price_col.replace(",", ""))
            if psf_match:
                psf = int(psf_match.group(1).replace(",", ""))

            if not price or not area:
                continue

            txns.append({
                "estate_id": estate_id,
                "date": date,
                "phase": phase,
                "block": block,
                "floor": floor_desc,
                "flat": flat,
                "rooms": rooms,
                "area_sqft": area,
                "price": price,
                "price_per_sqft": psf if psf > 0 else round(price / area),
                "source": "28hse",
            })
        break
    return txns


def _scrape_estate(estate_id: int, hse_id: int, name: str, max_pages: int) -> list[dict]:
    base_url = f"https://www.28hse.com/estate/detail/{name}-{hse_id}/transaction"
    all_txns = []
    client = httpx.Client(timeout=15, follow_redirects=True, verify=False)
    hdrs = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    }

    for page in range(1, max_pages + 1):
        url = base_url if page == 1 else f"{base_url}/page-{page}"
        try:
            resp = client.get(url, headers=hdrs)
            if resp.status_code != 200:
                break
        except Exception as e:
            print(f"[28hse] Error page {page} for {name}: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        txns = _parse_page(soup, estate_id)
        all_txns.extend(txns)

        has_next = any(f"page-{page + 1}" in a["href"] for a in soup.find_all("a", href=True))
        if not has_next:
            break

    print(f"[28hse] Scraped {len(all_txns)} transactions from {name} ({page} pages)")
    return all_txns


def scrape(full: bool = False) -> list[dict]:
    max_pages = FULL_MAX_PAGES if full else UPDATE_MAX_PAGES
    all_txns = []
    for eid, e in ESTATES.items():
        txns = _scrape_estate(eid, e["hse_id"], e["name"], max_pages)
        all_txns.extend(txns)

    out_path = os.path.join(DATA_DIR, "28hse_listings.csv")
    os.makedirs(DATA_DIR, exist_ok=True)
    if all_txns:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_txns[0].keys())
            writer.writeheader()
            writer.writerows(all_txns)
        print(f"[28hse] Saved {len(all_txns)} transactions to {out_path}")
    else:
        print("[28hse] No transactions scraped")
    return all_txns


if __name__ == "__main__":
    import sys
    full = "--full" in sys.argv
    scrape(full=full)

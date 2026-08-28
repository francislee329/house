# Development Guide

## Setup

```bash
# Install uv
pip install uv

# Clone and setup
cd /workspace/house
uv run python -m src.scrapers.seed_data
```

## Running

```bash
# Terminal 1: API
uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend && npx next dev --port 3000 --hostname 0.0.0.0
```

## Adding a New Estate

1. Add metadata to `data/estates_metadata.json`
2. Run seed script: `uv run python -m src.scrapers.seed_data`
3. The estate will appear in the API and frontend automatically

## Modifying Scoring Weights

Edit `src/analysis/scoring.py`:

```python
def compute_value_score(...):
    # Adjust these weights
    total = (
        price_vs_historical * 0.30  # Change 0.30 to desired weight
        + price_vs_peers * 0.25
        + rental_yield * 0.20
        + location * 0.15
        + building_condition * 0.10
    )
```

## Adding a New Scraper

1. Create `src/scrapers/new_source.py`
2. Implement `scrape()` function returning list of dicts
3. Add to `src/scrapers/seed_data.py`
4. Define CSV field mapping

## Database Schema

```sql
-- Estates: 4 四小龍 estates
CREATE TABLE estates (
    id INTEGER PRIMARY KEY,
    name TEXT,
    name_en TEXT,
    district TEXT,
    region TEXT,
    nearest_mtr TEXT,
    mtr_walk_minutes INTEGER,
    total_units INTEGER,
    building_age_years INTEGER,
    avg_price_per_sqft REAL
);

-- Listings: Current buy/rent listings
CREATE TABLE listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estate_id INTEGER,
    phase TEXT,
    block TEXT,
    floor TEXT,
    flat TEXT,
    rooms TEXT,
    area_sqft INTEGER,
    price INTEGER,
    price_per_sqft REAL,
    source TEXT,
    FOREIGN KEY (estate_id) REFERENCES estates(id)
);

-- Transactions: Historical records
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estate_id INTEGER,
    date TEXT,
    rooms TEXT,
    area_sqft INTEGER,
    price INTEGER,
    price_per_sqft REAL,
    FOREIGN KEY (estate_id) REFERENCES estates(id)
);

-- Price History: Monthly averages
CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estate_id INTEGER,
    month TEXT,
    avg_price_per_sqft REAL,
    volume INTEGER,
    FOREIGN KEY (estate_id) REFERENCES estates(id)
);
```

## Testing

```bash
# Test scoring model
uv run python -c "
from src.analysis.scoring import compute_value_score
result = compute_value_score(10000, 11000, 12000, 28, 2, 50)
print(f'Score: {result.total}')
print(f'Breakdown: {result.__dict__}')
"

# Test API endpoints
curl http://localhost:8000/api/estates | python -m json.tool
curl http://localhost:8000/api/ranking?limit=5 | python -m json.tool
```

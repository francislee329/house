# HK Flat Value Finder

Find the best value flats in Hong Kong — comparing historical prices, location, and value scores.

## Quick Start

```bash
# Install uv (if not installed)
pip install uv

# Setup & seed database
cd /workspace/house
uv run python -m src.scrapers.seed_data

# Start API server (port 8000)
uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Start frontend (port 3000)
cd frontend
npm install
npx next dev --port 3000 --hostname 0.0.0.0
```

Open http://localhost:3000

## Architecture

```
Backend:  Python 3.11 + FastAPI + SQLite + uv
Frontend: Next.js 14 + TypeScript + Tailwind + Recharts
```

## 四小龍 (Four Little Dragons) — MVP Estates

| Estate | District | MTR | Avg PSF | Units |
|--------|----------|-----|---------|-------|
| 美孚新邨 | 荔枝角 | Mei Foo (2min) | $10,687 | 9,980 |
| 太古城 | 太古 | Taikoo (1min) | $16,865 | 12,698 |
| 沙田第一城 | 沙田 | City One (3min) | $14,692 | 10,642 |
| 嘉湖山莊 | 天水圍 | Tin Shui Wai (8min) | $8,639 | 15,844 |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/estates` | List all estates |
| `GET /api/estates/{id}` | Estate detail + price history |
| `GET /api/listings` | Search listings (filter by estate, price, area, bedrooms) |
| `GET /api/ranking` | Properties ranked by value score |
| `GET /api/transactions` | Recent transactions per estate |
| `GET /api/chart/{id}` | Price history for charts |
| `GET /api/compare` | Compare 2-3 listings |

## Value Scoring Model

Score (0-100) based on 5 weighted factors:
- **Price vs Historical Average** (30%) — lower = better value
- **Price vs Peer Estates** (25%) — cheaper than comparable estates
- **Rental Yield** (20%) — estimated annual rent / price
- **Location Quality** (15%) — MTR proximity + school net
- **Building Condition** (10%) — newer = better condition

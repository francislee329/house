# AGENTS.md

## Project Overview
HK Flat Value Finder — a tool to find the best value flats in Hong Kong by comparing historical prices, location, and value scores. MVP focuses on 四小龍 (Four Little Dragons) estates.

## Tech Stack
- **Backend**: Python 3.11 + FastAPI + SQLite + uv
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Recharts
- **Package Manager**: uv (Python), npm (frontend)

## Commands

### Backend
```bash
# Full seed (first time) — scrapes all ~5000 transactions from 28Hse
uv run python -m src.scrapers.seed_data

# Update (daily/weekly) — scrapes recent 5 pages, skips duplicates
uv run python -m src.scrapers.seed_data --update

# Start API server
uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Run scoring model
uv run python -c "from src.analysis.scoring import compute_value_score; print(compute_value_score(10000, 11000, 12000, 28, 2, 50))"
```

### Frontend
```bash
cd frontend
npm install
npx next dev --port 3000 --hostname 0.0.0.0
npx next build
```

## Project Structure
```
house/
├── src/
│   ├── scrapers/          # Data collection
│   │   ├── centanet.py    # Centanet scraper
│   │   ├── twenty8hse.py  # 28Hse scraper
│   │   └── seed_data.py   # Seed database
│   ├── analysis/
│   │   ├── scoring.py     # Value scoring model
│   │   └── location.py    # Location/MTR scoring
│   ├── database/
│   │   ├── db.py          # SQLite connection
│   │   └── models.py      # SQLAlchemy models
│   └── api/
│       └── main.py        # FastAPI endpoints
├── frontend/
│   └── src/
│       ├── app/           # Next.js pages
│       ├── components/    # React components
│       └── lib/           # API client + utils
├── data/                  # Scraped CSVs + SQLite DB
├── pyproject.toml         # Python dependencies
└── README.md
```

## API Endpoints
- `GET /api/estates` — List all estates
- `GET /api/estates/{id}` — Estate detail + price history
- `GET /api/listings` — Search listings (filter: estate_id, min_price, max_price, min_area, bedrooms, sort_by)
- `GET /api/ranking` — Properties ranked by value score
- `GET /api/transactions` — Recent transactions per estate
- `GET /api/chart/{id}` — Price history for charts (filter: period)
- `GET /api/compare` — Compare 2-3 listings (filter: ids)

## Data Model
- **estates** — 4 四小龍 estates with metadata (MTR, school net, facilities)
- **listings** — Current buy/rent listings from Centanet + 28Hse
- **transactions** — Historical transaction records
- **price_history** — Monthly avg price per sqft per estate

## Value Scoring
Score (0-100) with 5 weighted factors:
1. Price vs Historical Average (30%)
2. Price vs Peer Estates (25%)
3. Rental Yield (20%)
4. Location Quality — MTR proximity (15%)
5. Building Condition — age (10%)

## Sub-Agent System
The project uses a coordinator pattern with 3 agents chained by dependencies:

```
data agent → backend agent → frontend agent
```

### Agents
| Agent | Script | Role | Triggers On |
|-------|--------|------|-------------|
| **data** | `agents/data_agent.py` | Scrape listings, transactions, metadata | Manual / schedule |
| **backend** | `agents/backend_agent.py` | Seed DB, test API, extract schema | data agent changes |
| **frontend** | `agents/frontend_agent.py` | Regenerate TypeScript types | backend schema changes |

### Coordinator Commands
```bash
# Run all agents in dependency order
uv run python agents/coordinator.py all

# Run single agent (auto-runs dependencies first)
uv run python agents/coordinator.py data
uv run python agents/coordinator.py backend
uv run python agents/coordinator.py frontend

# Check last run status
uv run python agents/coordinator.py --status
```

### How Dependency Chaining Works
1. **Data agent** scrapes → writes CSVs → updates `agents/manifest.json` changelog
2. **Backend agent** reads changelog → seeds DB → tests API → extracts schema to `agents/api_schema.json`
3. **Frontend agent** reads schema → detects field changes → regenerates `frontend/src/lib/api.ts`

Manifest tracks timestamps, changed files, and API diffs between runs.

## Notes
- Scrapers fetch real transaction data from 28Hse (~5000 records, 5 years)
- Database is SQLite at `data/hk_flat_finder.db`
- Frontend connects to API at `http://localhost:8000`
- Use `uv run` for all Python commands

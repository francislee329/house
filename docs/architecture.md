# Architecture

## System Design

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                          │
│              Next.js React Frontend                     │
│         http://localhost:3000                           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP API calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                        │
│              http://localhost:8000                       │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Endpoints   │  │  Scrapers   │  │  Scoring Model  │ │
│  │  /api/*      │  │  centanet   │  │  value_score()  │ │
│  │             │  │  28hse      │  │  location_score()│ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│         ▼                ▼                   ▼          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              SQLite Database                    │   │
│  │         data/hk_flat_finder.db                  │   │
│  │  estates | listings | transactions | price_hist  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Scraping**: `centanet.py` and `twenty8hse.py` fetch listings/transactions
2. **Storage**: Data stored in SQLite via SQLAlchemy ORM
3. **Scoring**: `scoring.py` computes value scores per listing
4. **API**: FastAPI serves data to frontend
5. **Display**: React components render tables, charts, maps

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | 4 estate cards with key stats |
| `/listings` | Listings | Searchable table with filters |
| `/ranking` | Ranking | Value-scored property rankings |
| `/estate/[id]` | EstateDetail | Price chart, transactions, metadata |
| `/compare` | Compare | Side-by-side 2-3 flats |

## Scoring Algorithm

```python
score = (
    price_vs_historical * 0.30 +   # How much below estate avg
    price_vs_peers * 0.25 +         # How much below peer estates
    rental_yield * 0.20 +           # Annual rent / price
    location * 0.15 +               # MTR walk time score
    building_condition * 0.10       # Age-based score
)
```

Each factor is normalized to 0-100.

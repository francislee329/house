# API Reference

Base URL: `http://localhost:8000/api`

## GET /estates

List all estates with summary stats.

**Response:**
```json
[
  {
    "id": 1,
    "name": "美孚新邨",
    "name_en": "Mei Foo Sun Chuen",
    "district": "Lai Chi Kok",
    "region": "Kowloon",
    "nearest_mtr": "Mei Foo",
    "mtr_walk_minutes": 2,
    "total_units": 9980,
    "building_age_years": 53,
    "avg_price_per_sqft": 10687,
    "transaction_count_30d": 30,
    "school_net": "62"
  }
]
```

## GET /estates/{id}

Get estate detail with metadata and price history.

**Response:**
```json
{
  "id": 1,
  "name": "美孚新邨",
  "name_en": "Mei Foo Sun Chuen",
  "district": "Lai Chi Kok",
  "region": "Kowloon",
  "nearest_mtr": "Mei Foo",
  "mtr_walk_minutes": 2,
  "total_units": 9980,
  "building_age_years": 53,
  "developer": "New World / Sino Land",
  "school_net": "62",
  "facilities": ["swimming_pool", "gym", "playground"],
  "unit_layouts": ["1房", "2房", "3房"],
  "avg_price_per_sqft": 10687,
  "price_range": {"min": 8897, "max": 13371},
  "price_history": [
    {"month": "2026-07", "avg_price_per_sqft": 10622, "volume": 18}
  ]
}
```

## GET /listings

Search and filter current listings.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| estate_id | int | Filter by estate |
| min_price | int | Minimum price (HKD) |
| max_price | int | Maximum price (HKD) |
| min_area | int | Minimum area (sqft) |
| bedrooms | int | Number of bedrooms (1, 2, 3) |
| sort_by | string | `value_score`, `price_asc`, `price_desc`, `area_desc` |
| limit | int | Results per page (default 50) |
| offset | int | Pagination offset |

**Response:**
```json
{
  "total": 120,
  "listings": [
    {
      "id": 1,
      "estate_id": 1,
      "estate_name": "美孚新邨",
      "phase": "3期",
      "block": "百老匯街52號",
      "floor": "中層",
      "flat": "C",
      "rooms": "3房",
      "area_sqft": 853,
      "price": 10236000,
      "price_per_sqft": 12000,
      "direction": "東南",
      "source": "centanet",
      "value_score": 82.5
    }
  ]
}
```

## GET /ranking

Get all properties ranked by value score.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| min_price | int | Minimum price |
| max_price | int | Maximum price |
| min_area | int | Minimum area |
| bedrooms | int | Number of bedrooms |
| limit | int | Max results (default 20) |

**Response:**
```json
{
  "ranked": [
    {
      "listing_id": 1,
      "estate_name": "嘉湖山莊",
      "address": "嘉湖山莊 樂湖居 13座 低層 G室",
      "rooms": "3房",
      "area_sqft": 548,
      "price": 4168000,
      "price_per_sqft": 7606,
      "value_score": 91.2,
      "score_breakdown": {
        "price_vs_historical": 85,
        "price_vs_peers": 92,
        "rental_yield": 88,
        "location": 75,
        "building_condition": 95
      }
    }
  ]
}
```

## GET /transactions

Get recent transactions for an estate.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| estate_id | int | Required. Estate ID |
| limit | int | Max results (default 50) |

**Response:**
```json
{
  "transactions": [
    {
      "date": "2026-08-11",
      "phase": "1期",
      "block": "百老匯街23號",
      "floor": "高層",
      "flat": "K",
      "rooms": "1房",
      "area_sqft": 590,
      "price": 5555000,
      "price_per_sqft": 9415,
      "source": "market"
    }
  ]
}
```

## GET /chart/{estate_id}

Get price history data for charts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| period | string | `1y`, `3y`, `5y`, `all` |

**Response:**
```json
{
  "estate_name": "美孚新邨",
  "period": "3y",
  "data": [
    {"month": "2023-08", "avg_price_per_sqft": 12500, "volume": 18}
  ]
}
```

## GET /compare

Compare 2-3 listings side by side.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| ids | string | Comma-separated listing IDs |

**Response:**
```json
{
  "listings": [
    {
      "id": 1,
      "estate_name": "美孚新邨",
      "price": 10236000,
      "area_sqft": 853,
      "price_per_sqft": 12000,
      "rooms": "3房",
      "floor": "中層",
      "mtr_walk_minutes": 2,
      "value_score": 82.5,
      "monthly_mortgage": 33900,
      "estimated_rent": 22000,
      "rental_yield": 2.6
    }
  ]
}
```

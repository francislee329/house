# Data Sources

## Primary Sources

### Centanet (中原地產)
- **URL**: https://hk.centanet.com
- **Data**: Current listings, transaction history, estate info
- **Method**: HTTP scraping of public JSON endpoints
- **Fallback**: Generated sample data based on known market prices

### 28Hse (香港屋網)
- **URL**: https://www.28hse.com
- **Data**: Current listings, valuations, recent transactions
- **Method**: HTTP scraping of public pages
- **Fallback**: Generated sample data

### Land Registry (土地註冊處)
- **URL**: https://data.gov.hk
- **Data**: Official transaction records, monthly statistics
- **Method**: CSV download from open data portal
- **Note**: Free and legal, no scraping required

## Estate Metadata

Manually compiled from public sources:

| Field | Source |
|-------|--------|
| MTR station + walk time | Google Maps / MTR website |
| School net | Education Bureau |
| Building age | Rating & Valuation Department |
| Developer | Property registry |
| Facilities | Estate management websites |
| Rental rates | 28Hse rental listings |

## Data Freshness

| Data | Update Frequency |
|------|-----------------|
| Listings | On scraper run |
| Transactions | On scraper run |
| Price history | Monthly |
| Estate metadata | Manual (rarely changes) |

## Sample Data

When live scraping fails, the system generates realistic sample data based on:

- Known average prices per sqft for each estate
- Historical price ranges
- Typical unit sizes and room configurations
- Realistic transaction volumes

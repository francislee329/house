from dataclasses import dataclass


@dataclass
class ScoreBreakdown:
    price_vs_historical: float
    price_vs_peers: float
    rental_yield: float
    location: float
    building_condition: float
    total: float


def compute_value_score(
    price_per_sqft: float,
    avg_historical_psf: float,
    peer_avg_psf: float,
    rent_per_sqft: float,
    mtr_walk_minutes: int,
    building_age_years: int,
) -> ScoreBreakdown:
    """
    Compute a value score (0-100) for a property listing.

    Weights:
    - price_vs_historical: 30%  (lower vs historical = better)
    - price_vs_peers: 25%       (lower vs peers = better)
    - rental_yield: 20%         (higher yield = better)
    - location: 15%             (closer to MTR = better)
    - building_condition: 10%   (newer = better)
    """
    # Price vs historical: how much cheaper than average
    if avg_historical_psf > 0:
        hist_ratio = price_per_sqft / avg_historical_psf
        price_vs_historical = max(0, min(100, (1 - hist_ratio) * 100 + 50))
    else:
        price_vs_historical = 50.0

    # Price vs peers: how much cheaper than peer estates
    if peer_avg_psf > 0:
        peer_ratio = price_per_sqft / peer_avg_psf
        price_vs_peers = max(0, min(100, (1 - peer_ratio) * 100 + 50))
    else:
        price_vs_peers = 50.0

    # Rental yield: annual rent / price
    if price_per_sqft > 0:
        annual_yield = (rent_per_sqft * 12) / price_per_sqft
        rental_yield = min(100, annual_yield * 500)
    else:
        rental_yield = 0.0

    # Location: MTR walk time
    location_scores = {1: 95, 2: 90, 3: 85, 5: 75, 8: 60, 10: 50, 15: 30}
    location = float(location_scores.get(mtr_walk_minutes, 40))

    # Building condition: age
    if building_age_years <= 10:
        building_condition = 95.0
    elif building_age_years <= 20:
        building_condition = 85.0
    elif building_age_years <= 30:
        building_condition = 75.0
    elif building_age_years <= 40:
        building_condition = 60.0
    elif building_age_years <= 50:
        building_condition = 45.0
    else:
        building_condition = 30.0

    total = (
        price_vs_historical * 0.30
        + price_vs_peers * 0.25
        + rental_yield * 0.20
        + location * 0.15
        + building_condition * 0.10
    )

    return ScoreBreakdown(
        price_vs_historical=round(price_vs_historical, 1),
        price_vs_peers=round(price_vs_peers, 1),
        rental_yield=round(rental_yield, 1),
        location=round(location, 1),
        building_condition=round(building_condition, 1),
        total=round(total, 1),
    )

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from database.db import SessionLocal, init_db
from database.models import Estate, Listing, Transaction, PriceHistory
from analysis.scoring import compute_value_score
from analysis.location import load_estates_metadata

MORTGAGE_RATE = 0.035
LTV_RATIO = 0.7
LOAN_TERM_YEARS = 25
UNEMPLOYMENT_MONTHS = 6
AGENT_FEE_RATE = 0.01
STAMP_DUTY_RATE = 0.0225
RATES_ANNUAL = 0.003
GOVT_RENT_ANNUAL = 0.03
PROPERTY_TAX_RATE = 0.15


def _compute_monthly_mortgage(price: float) -> dict:
    loan = price * LTV_RATIO
    monthly_rate = MORTGAGE_RATE / 12
    n = LOAN_TERM_YEARS * 12
    if monthly_rate > 0:
        monthly = loan * monthly_rate / (1 - (1 + monthly_rate) ** (-n))
    else:
        monthly = loan / n
    total_interest = monthly * n - loan
    return {
        "loan_amount": round(loan),
        "monthly_payment": round(monthly),
        "total_interest": round(total_interest),
        "total_cost": round(loan + total_interest),
    }


def _compute_cash_flow(price: float, area_sqft: int, rent_per_sqft: float) -> dict:
    mortgage = _compute_monthly_mortgage(price)
    est_rent = rent_per_sqft * area_sqft
    net = est_rent - mortgage["monthly_payment"]
    annual_yield = (rent_per_sqft * 12) / (price / area_sqft) if price > 0 else 0
    return {
        "estimated_monthly_rent": round(est_rent),
        "monthly_mortgage": mortgage["monthly_payment"],
        "net_monthly_cashflow": round(net),
        "annual_yield_pct": round(annual_yield * 100, 2),
        "mortgage_rate_pct": round(MORTGAGE_RATE * 100, 2),
        "yield_vs_mortgage": round(annual_yield / MORTGAGE_RATE, 2) if MORTGAGE_RATE > 0 else 0,
        "is_positive_cashflow": net >= 0,
    }


def _compute_stress_test(price: float, area_sqft: int, rent_per_sqft: float) -> dict:
    mortgage = _compute_monthly_mortgage(price)
    monthly = mortgage["monthly_payment"]
    savings_needed = monthly * UNEMPLOYMENT_MONTHS
    est_rent = rent_per_sqft * area_sqft
    net = est_rent - monthly
    return {
        "monthly_mortgage": monthly,
        "months_unemployed": UNEMPLOYMENT_MONTHS,
        "savings_needed": round(savings_needed),
        "breakeven_months": round(savings_needed / max(net, 1)),
        "passes_stress_test": savings_needed <= net * UNEMPLOYMENT_MONTHS * 3,
        "rent_covers_mortgage": est_rent >= monthly,
    }


def _compute_transaction_costs(price: float) -> dict:
    stamp_duty = price * STAMP_DUTY_RATE
    agent_fee = price * AGENT_FEE_RATE
    lawyer_fee = 15000
    total_upfront = stamp_duty + agent_fee + lawyer_fee
    return {
        "stamp_duty": round(stamp_duty),
        "agent_fee": round(agent_fee),
        "lawyer_fee": lawyer_fee,
        "total_upfront_cost": round(total_upfront),
        "stamp_duty_pct": STAMP_DUTY_RATE * 100,
    }


def _compute_bank_valuation(price_per_sqft: int, area_sqft: int) -> dict:
    estimated_value = price_per_sqft * area_sqft
    return {
        "estimated_value": estimated_value,
        "lenders_ltv": LTV_RATIO * 100,
        "max_loan": round(estimated_value * LTV_RATIO),
        "min_downpayment": round(estimated_value * (1 - LTV_RATIO)),
    }


def _compute_investment_score(cash_flow: dict, stress: dict, costs: dict, age: int) -> dict:
    score = 50
    if cash_flow["is_positive_cashflow"]:
        score += 20
    if cash_flow["yield_vs_mortgage"] >= 1:
        score += 10
    if stress["passes_stress_test"]:
        score += 10
    if cash_flow["annual_yield_pct"] >= 3.5:
        score += 5
    if age <= 20:
        score += 5
    return {"score": min(score, 100), "verdict": "值得考慮" if score >= 70 else "需要謹慎" if score >= 50 else "不建議"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="HK Flat Value Finder", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

estates_meta = {e["id"]: e for e in load_estates_metadata()}


def _get_peer_avg(db: Session) -> float:
    result = db.query(func.avg(Estate.avg_price_per_sqft)).scalar()
    return result or 10000


def _compute_score(db: Session, listing: Listing, estate: Estate) -> float:
    meta = estates_meta.get(listing.estate_id, {})
    rent_psf = meta.get("rent_per_sqft", 30)
    risk_factors = meta.get("risk_factors", {})
    peer_avg = _get_peer_avg(db)
    hist_avg = estate.avg_price_per_sqft or peer_avg
    score = compute_value_score(
        price_per_sqft=listing.price_per_sqft,
        avg_historical_psf=hist_avg,
        peer_avg_psf=peer_avg,
        rent_per_sqft=rent_psf,
        mtr_walk_minutes=estate.mtr_walk_minutes or 5,
        building_age_years=estate.building_age_years or 40,
        risk_factors=risk_factors,
    )
    return score


def _estate_to_dict(e: Estate) -> dict:
    meta = estates_meta.get(e.id, {})
    return {
        "id": e.id,
        "name": e.name,
        "name_en": e.name_en,
        "district": e.district,
        "region": e.region,
        "nearest_mtr": e.nearest_mtr,
        "mtr_walk_minutes": e.mtr_walk_minutes,
        "total_units": e.total_units,
        "building_age_years": e.building_age_years,
        "developer": e.developer,
        "school_net": e.school_net,
        "avg_price_per_sqft": e.avg_price_per_sqft,
        "facilities": eval(e.facilities) if e.facilities else [],
        "unit_layouts": eval(e.unit_layouts) if e.unit_layouts else [],
        "phases": e.phases,
        "is_group": meta.get("is_group", False),
        "member_estates": meta.get("member_estates", []),
        "pros": meta.get("pros", []),
        "cons": meta.get("cons", []),
        "user_complaints": meta.get("user_complaints", []),
        "risk_factors": meta.get("risk_factors", {}),
    }


def _listing_to_dict(l: Listing, value_score: float = 0) -> dict:
    return {
        "id": l.id,
        "estate_id": l.estate_id,
        "phase": l.phase,
        "block": l.block,
        "floor": l.floor,
        "flat": l.flat,
        "rooms": l.rooms,
        "area_sqft": l.area_sqft,
        "price": l.price,
        "price_per_sqft": l.price_per_sqft,
        "direction": l.direction,
        "source": l.source,
        "listing_url": l.listing_url,
        "listed_date": l.listed_date,
        "value_score": value_score,
    }


@app.get("/api/estates")
def list_estates(db: Session = Depends(get_db)):
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    estates = db.query(Estate).all()
    results = []
    for e in estates:
        d = _estate_to_dict(e)
        tx_count = db.query(Transaction).filter(
            Transaction.estate_id == e.id,
            Transaction.date >= thirty_days_ago,
        ).count()
        d["transaction_count_30d"] = tx_count

        # Calculate price_range from transactions (since listings table may be empty)
        txns = db.query(Transaction).filter(Transaction.estate_id == e.id).all()
        prices = [t.price_per_sqft for t in txns if t.price_per_sqft]
        d["price_range"] = {"min": min(prices) if prices else 0, "max": max(prices) if prices else 0}

        results.append(d)
    return results


@app.get("/api/estates/{estate_id}")
def get_estate(estate_id: int, db: Session = Depends(get_db)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    if not estate:
        return {"error": "Estate not found"}
    d = _estate_to_dict(estate)

    if d.get("is_group") and d.get("member_estates"):
        member_ids = d["member_estates"]
        all_listings = db.query(Listing).filter(Listing.estate_id.in_(member_ids)).all()
        all_txns = db.query(Transaction).filter(Transaction.estate_id.in_(member_ids)).all()
        all_history = db.query(PriceHistory).filter(PriceHistory.estate_id.in_(member_ids))\
            .order_by(PriceHistory.month).all()

        # Calculate price_range from transactions (since listings table may be empty)
        prices = [t.price_per_sqft for t in all_txns if t.price_per_sqft]
        d["price_range"] = {"min": min(prices) if prices else 0, "max": max(prices) if prices else 0}

        monthly = {}
        for h in all_history:
            if h.month not in monthly:
                monthly[h.month] = {"prices": [], "volume": 0}
            monthly[h.month]["prices"].append(h.avg_price_per_sqft)
            monthly[h.month]["volume"] += h.volume
        d["price_history"] = [
            {"month": m, "avg_price_per_sqft": round(sum(v["prices"]) / len(v["prices"])),
             "volume": v["volume"]}
            for m, v in sorted(monthly.items())
        ]

        members = []
        for mid in member_ids:
            me = db.query(Estate).filter(Estate.id == mid).first()
            if me:
                md = _estate_to_dict(me)
                # Calculate price_range from transactions for each member
                m_txns = db.query(Transaction).filter(Transaction.estate_id == mid).all()
                m_prices = [t.price_per_sqft for t in m_txns if t.price_per_sqft]
                md["price_range"] = {"min": min(m_prices) if m_prices else 0, "max": max(m_prices) if m_prices else 0}
                md["listing_count"] = len(db.query(Listing).filter(Listing.estate_id == mid).all())
                md["transaction_count_30d"] = len(m_txns)
                members.append(md)
        d["members"] = members
    else:
        listings = db.query(Listing).filter(Listing.estate_id == estate_id).all()
        # Calculate price_range from transactions (since listings table may be empty)
        txns = db.query(Transaction).filter(Transaction.estate_id == estate_id).all()
        prices = [t.price_per_sqft for t in txns if t.price_per_sqft]
        d["price_range"] = {"min": min(prices) if prices else 0, "max": max(prices) if prices else 0}

        history = db.query(PriceHistory).filter(PriceHistory.estate_id == estate_id)\
            .order_by(PriceHistory.month).all()
        d["price_history"] = [{"month": h.month, "avg_price_per_sqft": h.avg_price_per_sqft, "volume": h.volume} for h in history]

    return d


@app.get("/api/listings")
def list_listings(
    estate_id: int = Query(None),
    min_price: int = Query(None),
    max_price: int = Query(None),
    min_area: int = Query(None),
    bedrooms: int = Query(None),
    sort_by: str = Query("value_score"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Listing)
    if estate_id:
        q = q.filter(Listing.estate_id == estate_id)
    if min_price:
        q = q.filter(Listing.price >= min_price)
    if max_price:
        q = q.filter(Listing.price <= max_price)
    if min_area:
        q = q.filter(Listing.area_sqft >= min_area)
    if bedrooms:
        room_map = {1: "1房", 2: "2房", 3: "3房"}
        q = q.filter(Listing.rooms == room_map.get(bedrooms, f"{bedrooms}房"))

    all_listings = q.all()
    results = []
    for l in all_listings:
        estate = db.query(Estate).filter(Estate.id == l.estate_id).first()
        score = _compute_score(db, l, estate) if estate else 0
        d = _listing_to_dict(l, score.total if hasattr(score, 'total') else score)
        d["estate_name"] = estate.name if estate else ""
        results.append(d)

    sort_keys = {
        "value_score": lambda x: -x["value_score"],
        "price_asc": lambda x: x["price"],
        "price_desc": lambda x: -x["price"],
        "area_desc": lambda x: -x["area_sqft"],
        "price_per_sqft": lambda x: x["price_per_sqft"],
    }
    results.sort(key=sort_keys.get(sort_by, sort_keys["value_score"]))
    total = len(results)
    return {"total": total, "listings": results[offset:offset + limit]}


@app.get("/api/ranking")
def ranking(
    min_price: int = Query(None),
    max_price: int = Query(None),
    min_area: int = Query(None),
    bedrooms: int = Query(None),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Listing)
    if min_price:
        q = q.filter(Listing.price >= min_price)
    if max_price:
        q = q.filter(Listing.price <= max_price)
    if min_area:
        q = q.filter(Listing.area_sqft >= min_area)
    if bedrooms:
        room_map = {1: "1房", 2: "2房", 3: "3房"}
        q = q.filter(Listing.rooms == room_map.get(bedrooms, f"{bedrooms}房"))

    all_listings = q.all()
    results = []
    for l in all_listings:
        estate = db.query(Estate).filter(Estate.id == l.estate_id).first()
        if not estate:
            continue
        score = _compute_score(db, l, estate)
        results.append({
            "listing_id": l.id,
            "estate_name": estate.name,
            "address": f"{estate.name} {l.phase} {l.block} {l.floor} {l.flat}室",
            "rooms": l.rooms,
            "area_sqft": l.area_sqft,
            "price": l.price,
            "price_per_sqft": l.price_per_sqft,
            "value_score": score.total,
            "score_breakdown": {
                "price_vs_historical": score.price_vs_historical,
                "price_vs_peers": score.price_vs_peers,
                "rental_yield": score.rental_yield,
                "location": score.location,
                "building_condition": score.building_condition,
                "risk_penalty": score.risk_penalty,
            },
        })

    results.sort(key=lambda x: -x["value_score"])
    return {"ranked": results[:limit]}


@app.get("/api/transactions")
def list_transactions(estate_id: int = Query(...), limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    txns = db.query(Transaction).filter(Transaction.estate_id == estate_id)\
        .order_by(desc(Transaction.date)).limit(limit).all()
    return {
        "transactions": [
            {
                "date": t.date,
                "phase": t.phase,
                "block": t.block,
                "floor": t.floor,
                "flat": t.flat,
                "rooms": t.rooms,
                "area_sqft": t.area_sqft,
                "price": t.price,
                "price_per_sqft": t.price_per_sqft,
                "source": t.source,
            }
            for t in txns
        ]
    }


@app.get("/api/transactions/by-room/{estate_id}")
def transactions_by_room_estate(estate_id: int, db: Session = Depends(get_db)):
    from collections import defaultdict

    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    if not estate:
        return {"error": "Estate not found"}

    meta = estates_meta.get(estate_id, {})
    base_rent_psf = meta.get("rent_per_sqft", 30)

    if meta.get("is_group") and meta.get("member_estates"):
        member_ids = meta["member_estates"]
        txns = db.query(Transaction).filter(Transaction.estate_id.in_(member_ids))\
            .order_by(desc(Transaction.date)).all()
    else:
        txns = db.query(Transaction).filter(Transaction.estate_id == estate_id)\
            .order_by(desc(Transaction.date)).all()

    room_groups = defaultdict(list)
    for t in txns:
        rooms = t.rooms or ""
        if rooms in ("1房", "2房", "3房"):
            room_groups[rooms].append(t)

    room_rent_factors = {"1房": 1.1, "2房": 1.0, "3房": 0.9}

    result = {}
    for room_type in ("1房", "2房", "3房"):
        group = room_groups.get(room_type, [])
        monthly = defaultdict(list)
        for t in group:
            month = t.date[:7] if t.date else ""
            if month:
                monthly[month].append(t.price_per_sqft)

        months = sorted(monthly.keys())
        data = []
        for m in months:
            prices = monthly[m]
            data.append({
                "month": m,
                "avg_price_per_sqft": round(sum(prices) / len(prices)),
                "volume": len(prices),
            })

        all_prices = [t.price_per_sqft for t in group if t.price_per_sqft]
        avg_psf = round(sum(all_prices) / len(all_prices)) if all_prices else 0

        rent_factor = room_rent_factors.get(room_type, 1.0)
        avg_rent_psf = round(base_rent_psf * rent_factor)

        annual_yield = (avg_rent_psf * 12) / avg_psf if avg_psf > 0 else 0
        yield_pct = round(annual_yield * 100, 2)
        mortgage_pct = round(MORTGAGE_RATE * 100, 2)
        ratio = round(annual_yield / MORTGAGE_RATE, 2) if MORTGAGE_RATE > 0 else 0

        result[room_type] = {
            "data": data,
            "avg_price_per_sqft": avg_psf,
            "avg_rent_per_sqft": avg_rent_psf,
            "rental_yield_pct": yield_pct,
            "mortgage_rate_pct": mortgage_pct,
            "yield_to_mortgage_ratio": ratio,
            "count": len(group),
        }

    return {"estate_name": estate.name, "rooms": result}


@app.get("/api/transactions/by-room")
def transactions_by_room(db: Session = Depends(get_db)):
    from collections import defaultdict

    txns = db.query(Transaction).order_by(desc(Transaction.date)).all()

    room_groups = defaultdict(list)
    for t in txns:
        rooms = t.rooms or ""
        if rooms in ("1房", "2房", "3房"):
            room_groups[rooms].append(t)

    estate_rents = {}
    for eid, meta in estates_meta.items():
        estate_rents[eid] = meta.get("rent_per_sqft", 30)

    result = {}
    for room_type in ("1房", "2房", "3房"):
        group = room_groups.get(room_type, [])
        monthly = defaultdict(list)
        for t in group:
            month = t.date[:7] if t.date else ""
            if month:
                monthly[month].append(t.price_per_sqft)

        months = sorted(monthly.keys())
        data = []
        for m in months:
            prices = monthly[m]
            data.append({
                "month": m,
                "avg_price_per_sqft": round(sum(prices) / len(prices)),
                "volume": len(prices),
            })

        all_prices = [t.price_per_sqft for t in group if t.price_per_sqft]
        avg_psf = round(sum(all_prices) / len(all_prices)) if all_prices else 0

        rents = [estate_rents.get(t.estate_id, 30) for t in group]
        avg_rent_psf = round(sum(rents) / len(rents)) if rents else 30

        annual_yield = (avg_rent_psf * 12) / avg_psf if avg_psf > 0 else 0
        yield_pct = round(annual_yield * 100, 2)
        mortgage_pct = round(MORTGAGE_RATE * 100, 2)
        ratio = round(annual_yield / MORTGAGE_RATE, 2) if MORTGAGE_RATE > 0 else 0

        result[room_type] = {
            "data": data,
            "avg_price_per_sqft": avg_psf,
            "avg_rent_per_sqft": avg_rent_psf,
            "rental_yield_pct": yield_pct,
            "mortgage_rate_pct": mortgage_pct,
            "yield_to_mortgage_ratio": ratio,
            "count": len(group),
        }

    return result


@app.get("/api/chart/{estate_id}")
def chart_data(estate_id: int, period: str = Query("3y"), db: Session = Depends(get_db)):
    months_map = {"1y": 12, "3y": 36, "5y": 60, "all": 999}
    months = months_map.get(period, 36)
    cutoff = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m")
    history = db.query(PriceHistory).filter(
        PriceHistory.estate_id == estate_id,
        PriceHistory.month >= cutoff,
    ).order_by(PriceHistory.month).all()
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    return {
        "estate_name": estate.name if estate else "",
        "period": period,
        "data": [{"month": h.month, "avg_price_per_sqft": h.avg_price_per_sqft, "volume": h.volume} for h in history],
    }


@app.get("/api/investment-analysis/{estate_id}")
def investment_analysis(estate_id: int, price: int = Query(None), area: int = Query(None), db: Session = Depends(get_db)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    if not estate:
        return {"error": "Estate not found"}
    meta = estates_meta.get(estate_id, {})
    rent_psf = meta.get("rent_per_sqft", 30)
    
    if price and area:
        cash_flow = _compute_cash_flow(price, area, rent_psf)
        stress = _compute_stress_test(price, area, rent_psf)
        costs = _compute_transaction_costs(price)
        valuation = _compute_bank_valuation(price // area if area > 0 else 0, area)
        invest_score = _compute_investment_score(cash_flow, stress, costs, estate.building_age_years)
    else:
        cash_flow = None
        stress = None
        costs = None
        valuation = None
        invest_score = None
    
    return {
        "estate_id": estate_id,
        "estate_name": estate.name,
        "rent_per_sqft": rent_psf,
        "cash_flow": cash_flow,
        "stress_test": stress,
        "transaction_costs": costs,
        "bank_valuation": valuation,
        "investment_score": invest_score,
        "pros": meta.get("pros", []),
        "cons": meta.get("cons", []),
        "risk_factors": meta.get("risk_factors", {}),
    }


@app.get("/api/compare")
def compare(ids: str = Query(...), db: Session = Depends(get_db)):
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if len(id_list) < 2 or len(id_list) > 3:
        return {"error": "Please provide 2-3 listing IDs"}
    results = []
    for lid in id_list:
        listing = db.query(Listing).filter(Listing.id == lid).first()
        if not listing:
            continue
        estate = db.query(Estate).filter(Estate.id == listing.estate_id).first()
        meta = estates_meta.get(listing.estate_id, {})
        score = _compute_score(db, listing, estate)
        rent_psf = meta.get("rent_per_sqft", 30)

        cash_flow = _compute_cash_flow(listing.price, listing.area_sqft, rent_psf)
        stress = _compute_stress_test(listing.price, listing.area_sqft, rent_psf)
        costs = _compute_transaction_costs(listing.price)
        valuation = _compute_bank_valuation(listing.price_per_sqft, listing.area_sqft)
        invest_score = _compute_investment_score(cash_flow, stress, costs, estate.building_age_years if estate else 30)

        results.append({
            "id": listing.id,
            "estate_name": estate.name if estate else "",
            "phase": listing.phase,
            "block": listing.block,
            "floor": listing.floor,
            "flat": listing.flat,
            "rooms": listing.rooms,
            "area_sqft": listing.area_sqft,
            "price": listing.price,
            "price_per_sqft": listing.price_per_sqft,
            "mtr_walk_minutes": estate.mtr_walk_minutes if estate else 0,
            "value_score": score.total if hasattr(score, 'total') else score,
            "cash_flow": cash_flow,
            "stress_test": stress,
            "transaction_costs": costs,
            "bank_valuation": valuation,
            "investment_score": invest_score,
            "estate_pros": meta.get("pros", []),
            "estate_cons": meta.get("cons", []),
            "risk_factors": meta.get("risk_factors", {}),
        })
    return {"listings": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, desc
from database.db import SessionLocal, init_db
from database.models import Estate, Listing, Transaction, PriceHistory
from analysis.scoring import compute_value_score
from analysis.location import load_estates_metadata

app = FastAPI(title="HK Flat Value Finder", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

estates_meta = {e["id"]: e for e in load_estates_metadata()}


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
        "facilities": json.loads(e.facilities) if e.facilities else [],
        "unit_layouts": json.loads(e.unit_layouts) if e.unit_layouts else [],
        "phases": e.phases,
        "is_group": meta.get("is_group", False),
        "member_estates": meta.get("member_estates", []),
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


def _compute_score(listing: Listing, estate: Estate) -> float:
    meta = estates_meta.get(listing.estate_id, {})
    rent_psf = meta.get("rent_per_sqft", 25)
    peer_avg = sum(m.get("avg_price_per_sqft", 10000) for m in estates_meta.values()) / len(estates_meta)
    hist_avg = estate.avg_price_per_sqft or peer_avg
    score = compute_value_score(
        price_per_sqft=listing.price_per_sqft,
        avg_historical_psf=hist_avg,
        peer_avg_psf=peer_avg,
        rent_per_sqft=rent_psf,
        mtr_walk_minutes=estate.mtr_walk_minutes or 5,
        building_age_years=estate.building_age_years or 40,
    )
    return score.total


@app.get("/api/estates")
def list_estates():
    db = SessionLocal()
    try:
        estates = db.query(Estate).all()
        results = []
        for e in estates:
            d = _estate_to_dict(e)
            tx_count = db.query(Transaction).filter(Transaction.estate_id == e.id).count()
            d["transaction_count_30d"] = tx_count
            results.append(d)
        return results
    finally:
        db.close()


@app.get("/api/estates/{estate_id}")
def get_estate(estate_id: int):
    db = SessionLocal()
    try:
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

            prices = [l.price_per_sqft for l in all_listings if l.price_per_sqft]
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
                    m_listings = db.query(Listing).filter(Listing.estate_id == mid).all()
                    m_prices = [l.price_per_sqft for l in m_listings if l.price_per_sqft]
                    md["price_range"] = {"min": min(m_prices) if m_prices else 0, "max": max(m_prices) if m_prices else 0}
                    md["listing_count"] = len(m_listings)
                    m_txns = db.query(Transaction).filter(Transaction.estate_id == mid).count()
                    md["transaction_count_30d"] = m_txns
                    members.append(md)
            d["members"] = members
        else:
            listings = db.query(Listing).filter(Listing.estate_id == estate_id).all()
            prices = [l.price_per_sqft for l in listings if l.price_per_sqft]
            d["price_range"] = {"min": min(prices) if prices else 0, "max": max(prices) if prices else 0}

            history = db.query(PriceHistory).filter(PriceHistory.estate_id == estate_id)\
                .order_by(PriceHistory.month).all()
            d["price_history"] = [{"month": h.month, "avg_price_per_sqft": h.avg_price_per_sqft, "volume": h.volume} for h in history]

        return d
    finally:
        db.close()


@app.get("/api/listings")
def list_listings(
    estate_id: int = Query(None),
    min_price: int = Query(None),
    max_price: int = Query(None),
    min_area: int = Query(None),
    bedrooms: int = Query(None),
    sort_by: str = Query("value_score"),
    limit: int = Query(50),
    offset: int = Query(0),
):
    db = SessionLocal()
    try:
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
            score = _compute_score(l, estate) if estate else 0
            d = _listing_to_dict(l, score)
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
    finally:
        db.close()


@app.get("/api/ranking")
def ranking(
    min_price: int = Query(None),
    max_price: int = Query(None),
    min_area: int = Query(None),
    bedrooms: int = Query(None),
    limit: int = Query(20),
):
    db = SessionLocal()
    try:
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
            meta = estates_meta.get(l.estate_id, {})
            rent_psf = meta.get("rent_per_sqft", 25)
            peer_avg = sum(m.get("avg_price_per_sqft", 10000) for m in estates_meta.values()) / len(estates_meta)
            hist_avg = estate.avg_price_per_sqft or peer_avg
            score = compute_value_score(
                price_per_sqft=l.price_per_sqft,
                avg_historical_psf=hist_avg,
                peer_avg_psf=peer_avg,
                rent_per_sqft=rent_psf,
                mtr_walk_minutes=estate.mtr_walk_minutes or 5,
                building_age_years=estate.building_age_years or 40,
            )
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
                },
            })

        results.sort(key=lambda x: -x["value_score"])
        return {"ranked": results[:limit]}
    finally:
        db.close()


@app.get("/api/transactions")
def list_transactions(estate_id: int = Query(...), limit: int = Query(50)):
    db = SessionLocal()
    try:
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
    finally:
        db.close()


@app.get("/api/transactions/by-room/{estate_id}")
def transactions_by_room_estate(estate_id: int):
    db = SessionLocal()
    try:
        from collections import defaultdict

        MORTGAGE_RATE = 0.035

        estate = db.query(Estate).filter(Estate.id == estate_id).first()
        if not estate:
            return {"error": "Estate not found"}

        meta = estates_meta.get(estate_id, {})
        base_rent_psf = meta.get("rent_per_sqft", 28)

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
    finally:
        db.close()


@app.get("/api/transactions/by-room")
def transactions_by_room():
    db = SessionLocal()
    try:
        from collections import defaultdict

        MORTGAGE_RATE = 0.035

        txns = db.query(Transaction).order_by(desc(Transaction.date)).all()

        room_groups = defaultdict(list)
        for t in txns:
            rooms = t.rooms or ""
            if rooms in ("1房", "2房", "3房"):
                room_groups[rooms].append(t)

        estate_rents = {}
        for eid, rent in db.query(Transaction.estate_id, func.avg(Transaction.price_per_sqft)).group_by(Transaction.estate_id).all():
            estate_rents[eid] = rent * 0.003

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

            rents = [estate_rents.get(t.estate_id, 28) for t in group]
            avg_rent_psf = round(sum(rents) / len(rents)) if rents else 28

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
    finally:
        db.close()


@app.get("/api/chart/{estate_id}")
def chart_data(estate_id: int, period: str = Query("3y")):
    db = SessionLocal()
    try:
        months_map = {"1y": 12, "3y": 36, "5y": 60, "all": 999}
        months = months_map.get(period, 36)
        from datetime import datetime, timedelta
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
    finally:
        db.close()


@app.get("/api/compare")
def compare(ids: str = Query(...)):
    db = SessionLocal()
    try:
        id_list = [int(x) for x in ids.split(",") if x.strip()]
        results = []
        for lid in id_list:
            listing = db.query(Listing).filter(Listing.id == lid).first()
            if not listing:
                continue
            estate = db.query(Estate).filter(Estate.id == listing.estate_id).first()
            meta = estates_meta.get(listing.estate_id, {})
            score = _compute_score(listing, estate) if estate else 0
            rent_psf = meta.get("rent_per_sqft", 25)
            est_rent = rent_psf * listing.area_sqft
            monthly_mortgage = int(listing.price * 0.7 * 0.03 / 12 / (1 - (1 + 0.03 / 12) ** (-25 * 12)))
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
                "value_score": score,
                "monthly_mortgage": monthly_mortgage,
                "estimated_rent": est_rent,
                "rental_yield": round(est_rent * 12 / listing.price * 100, 1) if listing.price > 0 else 0,
            })
        return {"listings": results}
    finally:
        db.close()


@app.on_event("startup")
def startup():
    init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

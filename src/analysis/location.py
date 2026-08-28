import json
import os

ESTATES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "estates_metadata.json")


def load_estates_metadata() -> list[dict]:
    with open(ESTATES_PATH, encoding="utf-8") as f:
        return json.load(f)


def location_score(mtr_walk_minutes: int, school_net: str) -> int:
    """Score location from 0-100 based on MTR proximity and school net quality."""
    mtr_scores = {1: 95, 2: 90, 3: 85, 5: 75, 8: 60, 10: 50, 15: 30}
    mtr_score = mtr_scores.get(mtr_walk_minutes, 40)

    good_school_nets = {"14": 90, "11": 88, "34": 85, "62": 80, "91": 75, "72": 65}
    school_score = good_school_nets.get(school_net, 60)

    return int(mtr_score * 0.6 + school_score * 0.4)


def find_nearest_mtr(lat: float, lng: float) -> tuple[str, int]:
    """Find nearest MTR station and walking time estimate."""
    mtr_stations = [
        ("Mei Foo", 22.3380, 114.1350),
        ("Taikoo", 22.2860, 114.2140),
        ("City One", 22.3820, 114.1890),
        ("Tin Shui Wai", 22.4450, 113.9970),
    ]
    best_station, best_dist = "", float("inf")
    for name, slat, slng in mtr_stations:
        dist = ((lat - slat) ** 2 + (lng - slng) ** 2) ** 0.5
        if dist < best_dist:
            best_station, best_dist = name, dist
    walk_minutes = max(1, int(best_dist * 500))
    return best_station, walk_minutes

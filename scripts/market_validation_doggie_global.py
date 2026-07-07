# -*- coding: utf-8 -*-
"""Doggie Mystic 글로벌(미국·일본) 타겟 검증 — Nemotron-Personas-USA/Japan.

리포트: _company/market-validation/NEMOTRON_PERSONAS_KOREA_시장검증.md §5

사용법:
    pip install pandas pyarrow
    python scripts/market_validation_doggie_global.py

샤드 1개씩(미국 ~233MB / 일본 ~207MB)을 내려받아
반려견 고관여 × 운세 관심 × K-컬처 친화 세그먼트를 국가별로 산출한다.
"""
import json
import os
import urllib.request

import pandas as pd

SHARDS = {
    "USA": (
        "https://huggingface.co/api/datasets/nvidia/Nemotron-Personas-USA"
        "/parquet/default/train/0.parquet",
        "/tmp/nemotron_usa_shard0.parquet",
    ),
    "Japan": (
        "https://huggingface.co/api/datasets/nvidia/Nemotron-Personas-Japan"
        "/parquet/default/train/0.parquet",
        "/tmp/nemotron_japan_shard0.parquet",
    ),
}
ADULT_POP = {"USA": 262_000_000, "Japan": 104_000_000}  # 18세 이상 근사
TEXT_COLS = [
    "persona", "professional_persona", "hobbies_and_interests",
    "skills_and_expertise", "career_goals_and_ambitions",
    "arts_persona", "culinary_persona", "travel_persona", "sports_persona",
]

PATTERNS = {
    "USA": dict(
        dog=r"\b(?:dogs?|pupp(?:y|ies))\b",
        mystic=r"astrolog|horoscope|tarot|zodiac|fortune.?tell|birth chart|psychic|spiritual",
        kculture=r"k-?pop|korean (?:drama|culture|music|wave)|k-?drama|\bBTS\b|hallyu",
        female="Female",
        edu_hi=lambda d: d["education_level"].isin(
            ["some_college", "associates", "bachelors", "graduate"]),
        employed=lambda d: ~d["occupation"].isin(["not_in_workforce", "no_occupation"]),
    ),
    "Japan": dict(
        dog=r"犬|いぬ|柴犬|愛犬|子犬|チワワ|プードル|ドッグ|ペット",
        mystic=r"占い|星占い|タロット|風水|おみくじ|運勢|スピリチュアル|手相",
        kculture=r"韓国|K-?POP|韓流|Kドラマ|ハングル",
        female="女",
        edu_hi=lambda d: d["education_level"].str.contains("大学|短大|高専|大学院", na=False),
        employed=lambda d: ~d["occupation"].fillna("無職").str.contains("無職|なし"),
    ),
}


def analyze(country: str) -> dict:
    url, path = SHARDS[country]
    if not os.path.exists(path):
        print(f"[{country}] downloading shard -> {path}")
        urllib.request.urlretrieve(url, path)
    df = pd.read_parquet(path)
    df = df[df["age"] >= 18].copy()

    p = PATTERNS[country]
    text = df[TEXT_COLS[0]].fillna("")
    for c in TEXT_COLS[1:]:
        if c in df.columns:
            text = text + " " + df[c].fillna("")

    dog = text.str.contains(p["dog"], regex=True, na=False, case=False)
    mystic = text.str.contains(p["mystic"], regex=True, na=False, case=False)
    kculture = text.str.contains(p["kculture"], regex=True, na=False, case=False)
    female_2545 = df["sex"].eq(p["female"]) & df["age"].between(25, 45)

    # 결제여력 프록시(0~3): 취업 + 대학경험 이상 + 25-54세 (상위 = 2점 이상)
    pay = (p["employed"](df).astype(int) + p["edu_hi"](df).astype(int)
           + df["age"].between(25, 54).astype(int))

    segments = {
        "반려견 고관여": dog,
        "운세/점성 고관여": mystic,
        "K-컬처 친화": kculture,
        "코어 (반려견×(운세 or 여성25-45))": dog & (mystic | female_2545),
        "광의 (반려견 18-59세)": dog & df["age"].between(18, 59),
        "반려견×K-컬처 교집합": dog & kculture,
    }
    out = {}
    for name, mask in segments.items():
        sub = df[mask]
        hi = (pay[mask] >= 2).mean() if mask.sum() else 0.0
        out[name] = {
            "표본": int(mask.sum()),
            "비율%": round(mask.mean() * 100, 3),
            "인구환산": int(mask.mean() * ADULT_POP[country]),
            "평균나이": round(sub["age"].mean(), 1) if mask.sum() else None,
            "여성%": round((sub["sex"] == p["female"]).mean() * 100, 1) if mask.sum() else None,
            "결제여력상위%": round(hi * 100, 1),
            "결제여력층": int(mask.mean() * hi * ADULT_POP[country]),
        }
    return {"성인표본": len(df), "세그먼트": out}


if __name__ == "__main__":
    for country in SHARDS:
        print(f"\n===== {country} =====")
        print(json.dumps(analyze(country), ensure_ascii=False, indent=2))

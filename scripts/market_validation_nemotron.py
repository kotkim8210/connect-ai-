# -*- coding: utf-8 -*-
"""Nemotron-Personas-Korea 기반 사업 타겟층 시장 검증 스크립트.

리포트: _company/market-validation/NEMOTRON_PERSONAS_KOREA_시장검증.md

사용법:
    pip install pandas pyarrow requests
    python scripts/market_validation_nemotron.py

첫 실행 시 HF에서 parquet 샤드 1개(~211MB, 111,112명)를 내려받아
사업별 세그먼트 규모·인구 환산(TAM/SAM)·결제여력 프록시를 출력한다.
"""
import json
import os
import urllib.request

import pandas as pd

SHARD_URL = (
    "https://huggingface.co/api/datasets/nvidia/Nemotron-Personas-Korea"
    "/parquet/default/train/0.parquet"
)
SHARD_PATH = os.environ.get("NEMOTRON_SHARD", "/tmp/nemotron_korea_shard0.parquet")
KOREA_ADULTS = 44_000_000  # 19세 이상 성인 인구 근사 (2025 주민등록)


def load() -> pd.DataFrame:
    if not os.path.exists(SHARD_PATH):
        print(f"downloading shard -> {SHARD_PATH}")
        urllib.request.urlretrieve(SHARD_URL, SHARD_PATH)
    return pd.read_parquet(SHARD_PATH)


def main() -> None:
    df = load()
    text = (
        df["persona"].fillna("") + " " + df["professional_persona"].fillna("") + " "
        + df["hobbies_and_interests"].fillna("") + " " + df["skills_and_expertise"].fillna("") + " "
        + df["career_goals_and_ambitions"].fillna("") + " " + df["family_persona"].fillna("") + " "
        + df["arts_persona"].fillna("") + " " + df["culinary_persona"].fillna("") + " "
        + df["travel_persona"].fillna("")
    )

    def has(pattern: str) -> pd.Series:
        return text.str.contains(pattern, regex=True, na=False)

    occ = df["occupation"].fillna("")
    age, sex = df["age"], df["sex"]

    # 관심사 플래그 (페르소나 텍스트 언급 = 고관여 프록시)
    pet_dog = has("강아지|반려견|반려동물|애견")
    fortune = has("사주|운세|타로|점술|명리|무속")
    dev = has("개발자|프로그래밍|코딩|소프트웨어 개발|앱 개발|웹 개발|데이터 분석")
    creator = has("유튜버|크리에이터|1인 미디어|브이로그|영상 편집|콘텐츠 제작|채널을 운영|채널 운영|블로그를 운영|블로거")
    biz = has("창업|부업|사이드 프로젝트|1인 기업|스타트업|온라인 쇼핑몰|스마트스토어|온라인 판매")
    game = has("게임")
    selfdev = has("자기계발|온라인 강의|인터넷 강의|온라인 클래스|자격증")
    automation = has("자동화|노코드|디지털 도구|생산성")
    ai = has("인공지능|AI 기술|챗GPT|ChatGPT|머신러닝")

    occ_it = occ.str.contains("개발자|프로그래머|소프트웨어|데이터|정보통신|웹|시스템|컴퓨터|정보 시스템|네트워크|보안", regex=True)
    occ_selfemp = occ.str.contains("경영자|자영업|상점|판매원|음식점|프리랜서|중개인|운영", regex=True)
    employed = occ.ne("무직") & occ.ne("")

    # 결제여력 프록시 (0~4): 취업 + 전문대 이상 + 25-54세 + 수도권
    edu_hi = df["education_level"].isin(["4년제 대학교", "대학원", "2~3년제 전문대학"])
    metro = df["province"].isin(["서울", "경기", "인천"])
    df["pay_score"] = (
        employed.astype(int) + edu_hi.astype(int)
        + age.between(25, 54).astype(int) + metro.astype(int)
    )

    core_builder = dev | occ_it | (biz & (automation | ai | selfdev))
    segments = {
        "① Connect AI / A.U 멤버십": (core_builder | (creator & biz)) & age.between(19, 59),
        "② EZER 키트 (비개발자)": (biz | selfdev | creator) & ~(dev | occ_it) & age.between(19, 59),
        "③ Doggie Mystic 코어": pet_dog & (fortune | (sex.eq("여자") & age.between(25, 45))),
        "③′ Doggie Mystic 광의": pet_dog & age.between(19, 59),
        "④ 소액결제 미니게임": game & age.between(19, 39),
        "⑤ AI 비서 (자영업)": (occ_selfemp | biz) & employed & age.between(25, 59),
    }

    result = {}
    for name, mask in segments.items():
        sub = df[mask]
        pay_hi = (sub["pay_score"] >= 3).mean()
        result[name] = {
            "표본": int(mask.sum()),
            "비율%": round(mask.mean() * 100, 2),
            "TAM(명)": int(mask.mean() * KOREA_ADULTS),
            "결제여력상위%": round(pay_hi * 100, 1),
            "SAM(명)": int(mask.mean() * pay_hi * KOREA_ADULTS),
            "평균나이": round(sub["age"].mean(), 1),
            "여성%": round((sub["sex"] == "여자").mean() * 100, 1),
            "취업%": round((sub["occupation"].ne("무직")).mean() * 100, 1),
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

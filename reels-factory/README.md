# 🎬 Reels Factory — Doggie Mystic 릴스 자동 생성기

강아지 사진 + AI 카드 이미지를 넣으면 **15초 인스타 릴스(9:16, 1080×1920)** 영상을
자동으로 렌더링하는 Remotion 템플릿. 릴스 1개당 제작 시간을 수동 편집 30분~1시간에서
**렌더링 몇 분**으로 줄이는 것이 목적이다.

배경: `_company/market-validation/NEMOTRON_PERSONAS_KOREA_시장검증.md` §6 —
"AI 강아지 캐릭터 카드" 4~6주 타임박스 실험의 콘텐츠 리소스 병목 해소용.

## 영상 구성 (15초)

| 구간 | 장면 |
|---|---|
| 0–3초 | 훅 — 강아지 사진 등장 + "우리 강아지가 전설의 캐릭터가 된다면?" |
| 3–8초 | 변신 — 마법 파티클 수렴 + 카드 뒷면 회전 |
| 8–13초 | 공개 — 카드 플립 + 골드 버스트 + 이름/칭호 |
| 13–15초 | CTA — "DM으로 사진 보내면 무료로 만들어드려요" |

## 사용법

```bash
npm install

# 1) 미리보기 (Remotion Studio) — 사이드바에서 props 실시간 편집 가능
npx remotion studio

# 2) 단건 렌더링 (샘플 데이터)
npx remotion render DoggieReel out/sample.mp4

# 3) 배치 렌더링 — 여러 강아지를 한 번에
cp reels.example.json reels.json
#    → 강아지 사진은 public/photos/, 카드 이미지는 public/cards/ 에 넣고
#      reels.json 에서 파일명·이름·칭호를 수정
node scripts/render-reels.mjs
#    → out/<id>.mp4 로 출력
```

## 원커맨드 파이프라인: 사진 → 카드 → 릴스

```bash
# 사진 1장으로 카드 생성 + 릴스 렌더링까지 한 번에
node scripts/photo-to-reel.mjs public/photos/golden.jpg 해피 "태양의 전령"
# → public/cards/해피.png(카드) + out/해피.mp4(릴스)

# 칭호를 생략하면 Gemini가 자동 생성
node scripts/photo-to-reel.mjs ~/Downloads/dog.jpg 몽실이
```

- **`GEMINI_API_KEY` 환경변수 설정 시**: 사진을 Gemini 이미지 모델로 보내
  타로 카드풍 일러스트를 실제 생성 (모델은 `GEMINI_IMAGE_MODEL`로 변경 가능)
- **키가 없으면**: 이름·칭호가 박힌 플레이스홀더 카드로 대체 (파이프라인 검증용)
- 키는 절대 커밋하지 말 것 — `.env`는 `.gitignore`에 포함됨

## 📸 사진 소싱 규칙 (중요)

| 소스 | 사용 가능? | 비고 |
|---|---|---|
| 구글 이미지 검색 | ❌ **절대 금지** | 저작권 침해 — 상업 마케팅에 쓰면 법적 리스크 |
| 고객 DM 사진 | ✅ | **"콘텐츠 활용에 동의합니다" 한 줄 동의** 받은 것만 |
| 지인 반려견 | ✅ | 동의 받고 사용 — 초기 실전 콘텐츠로 최적 |
| 무료 스톡 (Unsplash·Pexels·Pixabay) | ✅ | 상업적 사용 OK, 표기 불필요 — 데모용 |
| AI 생성 사진 | ✅ | 데모만 — 실전에선 "진짜 변신" 신뢰를 해침 |

- 사용한 사진은 `public/photos/CREDITS.md`에 출처 기록
- 사진 스펙: 얼굴 정면~약측면, 밝은 조명, 단순한 배경, 800px 이상, 얼굴 중앙 배치

## 커스터마이즈 포인트

- 문구/사진/이름은 전부 props (`reels.json`) — 코드 수정 불필요
- 색 팔레트·폰트는 `src/DoggieReel.tsx` 상단 `C` 상수와 폰트 로딩부
  (저장소 디자인 톤 가이드: pink `#ec4899` · lavender `#a78bfa` · gold `#fbbf24`)
- 폰트는 `public/fonts/` 로컬 TTF (Jua·나눔펜스크립트·본고딕) — 오프라인 렌더링 가능

## 참고

- 원격/CI 컨테이너에서 렌더링할 때 크로미움이 별도 경로에 있으면:
  `REMOTION_BROWSER_EXECUTABLE=<headless_shell 경로>` 환경변수 지정
- 카드 이미지는 실서비스에선 Gemini/Imagen 생성물을 넣는다 (지금은 `sample-card.svg` 플레이스홀더)

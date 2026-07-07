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

## 커스터마이즈 포인트

- 문구/사진/이름은 전부 props (`reels.json`) — 코드 수정 불필요
- 색 팔레트·폰트는 `src/DoggieReel.tsx` 상단 `C` 상수와 폰트 로딩부
  (저장소 디자인 톤 가이드: pink `#ec4899` · lavender `#a78bfa` · gold `#fbbf24`)
- 폰트는 `public/fonts/` 로컬 TTF (Jua·나눔펜스크립트·본고딕) — 오프라인 렌더링 가능

## 참고

- 원격/CI 컨테이너에서 렌더링할 때 크로미움이 별도 경로에 있으면:
  `REMOTION_BROWSER_EXECUTABLE=<headless_shell 경로>` 환경변수 지정
- 카드 이미지는 실서비스에선 Gemini/Imagen 생성물을 넣는다 (지금은 `sample-card.svg` 플레이스홀더)

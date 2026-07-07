#!/usr/bin/env node
/**
 * 강아지 사진 → 미스틱 카드 이미지 생성 (리서치 기반 v2).
 *
 * 핵심 설계 (근거: _company/market-validation/카드_이미지_리서치.md):
 * - 결제 전환의 생명선은 "닮음(likeness)" → 2단계 파이프라인:
 *   ① 텍스트 모델로 사진에서 개체 특징(품종·털색·무늬·눈·귀) 추출
 *   ② 특징 보존 지시를 프롬프트 앞에, 스타일 지시를 뒤에 배치해 이미지 생성
 * - 한글 텍스트는 이미지에 굽지 않음(자모 깨짐) → 제목은 Remotion 오버레이
 * - 3:4 종횡비는 imageConfig 파라미터 + 프롬프트 이중 지정
 * - 기본 모델: Nano Banana 2 Lite (Google 권장 이전 대상, 장당 ~$0.034)
 *
 * CLI:  node scripts/generate-card.mjs <사진경로> <강아지이름> [칭호] [--style=royal]
 * 스타일: royal(기본) | hanbok | idphoto | sanrio | tarot
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * 시장 검증된 스타일 프리셋 (팔리는 순서대로):
 * royal  — Crown & Paw 공식: 르네상스 귀족/왕실 초상 (첫해 $10M 검증)
 * hanbok — 한국형: 한복/설빔 (헬로우봇 검증)
 * idphoto— 한국형: 증명사진 트렌드 (Z세대 유행)
 * sanrio — K-cute: 파스텔 산리오 문법 (2030 여성 감성)
 * tarot  — 기존 Doggie Mystic 미스틱 타로 톤
 */
const STYLES = {
  royal: `a majestic Renaissance royal portrait: the dog dressed in ornate king's regalia with
a deep crimson velvet robe, gold-embroidered collar and a jeweled crown, dark oil-painting
background with dramatic Rembrandt lighting, rich baroque color palette, visible oil brush
texture, museum-quality classical portrait framing`,
  hanbok: `an elegant Korean traditional portrait: the dog wearing a beautiful silk hanbok with
saekdong (rainbow-striped) sleeves and a norigae pendant, seated gracefully before a folding
screen with subtle dancheong patterns, soft festive lighting, warm celebratory palette of
jade green, coral pink and gold`,
  idphoto: `a formal Korean-style ID photograph: the dog in a neat navy suit with a crisp white
shirt, perfectly centered head-and-shoulders composition against a soft sky-blue gradient
studio background, clean even lighting, earnest dignified expression, photorealistic studio
portrait quality`,
  sanrio: `an adorable pastel kawaii illustration: the dog as a soft rounded chibi character
with big sparkling eyes, surrounded by ribbons, hearts and tiny stars, gentle pastel palette
of baby pink, lavender and cream, clean thick outlines, dreamy sticker-art finish`,
  tarot: `a mystical tarot card illustration: the dog as a heroic guardian character beneath a
gold crescent moon and constellation patterns, deep violet-indigo night palette with warm
gold accents, ornate celestial symbols, soft ethereal glow, premium gold-foil aesthetic`,
};

const clean = (s) => s.replace(/\s+/g, " ").trim();

async function gemini(model, body) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${model} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const inlinePhoto = (photoPath) => ({
  inline_data: {
    mime_type: photoPath.endsWith(".png") ? "image/png" : "image/jpeg",
    data: readFileSync(photoPath).toString("base64"),
  },
});

/** 1단계: 사진에서 닮음 보존용 개체 특징 + 칭호 추출 */
async function analyzeDog(photoPath, name, title) {
  const out = await gemini(TEXT_MODEL, {
    contents: [{
      parts: [
        inlinePhoto(photoPath),
        {
          text: `Analyze this dog photo and return JSON only:
{"features": "<one English sentence listing breed (or best guess), coat color and texture,
distinctive markings and their exact locations, eye color, ear shape/set, muzzle shape,
and any unique identifying traits>",
"title": "<한국어 2~5글자 카드 칭호, 예: 달빛 수호자, 태양의 전령${title ? ` — 사용자가 지정한 칭호 "${title}"를 그대로 사용` : `, 강아지 인상에 어울리게 창작`}>"}`,
        },
      ],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const text = out.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text);
  return {
    features: parsed.features ?? "a dog with its natural coat and features",
    title: title || parsed.title || "전설의 친구",
  };
}

/** 2단계: 닮음 보존 우선 + 스타일 후치 프롬프트 (Google 공식 가이드 구조) */
const buildPrompt = (features, styleKey) => clean(`
Using the provided photo of the dog, preserve its exact likeness: ${features}.
Keep the same face structure, proportions, fur markings and eye color so the owner
instantly recognizes their own dog.
Transform this photograph into ${STYLES[styleKey]}.
Compose it as a 3:4 portrait trading-card illustration with the dog's face as the
clear focal point in the upper two-thirds, and quiet, uncluttered space along the
bottom edge for a title to be added later. A clean illustration with no text,
letters or watermarks anywhere in the image.`);

async function generateCardImage(photoPath, features, styleKey, outPath) {
  const out = await gemini(IMAGE_MODEL, {
    contents: [{ parts: [inlinePhoto(photoPath), { text: buildPrompt(features, styleKey) }] }],
    generationConfig: { imageConfig: { aspectRatio: "3:4" } },
  });
  const part = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData ?? p.inline_data);
  const data = (part?.inlineData ?? part?.inline_data)?.data;
  if (!data) throw new Error(`이미지가 응답에 없습니다: ${JSON.stringify(out).slice(0, 400)}`);
  writeFileSync(outPath, Buffer.from(data, "base64"));
}

/** API 키 없을 때: 이름·칭호가 박힌 플레이스홀더 SVG 카드 */
function placeholderCard(name, title, outPath) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="924" viewBox="0 0 660 924">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2a1a5e"/><stop offset="1" stop-color="#0d0a2c"/>
  </linearGradient></defs>
  <rect width="660" height="924" rx="30" fill="url(#bg)"/>
  <rect x="18" y="18" width="624" height="888" rx="22" fill="none" stroke="#fbbf24" stroke-width="4"/>
  <path d="M470 180 a70 70 0 1 0 30 133 a55 55 0 1 1 -30 -133 Z" fill="#fbbf24"/>
  <circle cx="330" cy="430" r="120" fill="#d9a066"/>
  <ellipse cx="248" cy="352" rx="42" ry="70" fill="#a9744f" transform="rotate(-20 248 352)"/>
  <ellipse cx="412" cy="352" rx="42" ry="70" fill="#a9744f" transform="rotate(20 412 352)"/>
  <ellipse cx="330" cy="472" rx="66" ry="50" fill="#f3d5ae"/>
  <circle cx="292" cy="412" r="14" fill="#3b2b20"/><circle cx="368" cy="412" r="14" fill="#3b2b20"/>
  <ellipse cx="330" cy="458" rx="17" ry="12" fill="#3b2b20"/>
  <text x="330" y="700" text-anchor="middle" font-family="serif" font-size="60" fill="#fbbf24">${title}</text>
  <text x="330" y="780" text-anchor="middle" font-family="serif" font-size="36" fill="#a78bfa">${name}</text>
  <text x="330" y="860" text-anchor="middle" font-family="serif" font-size="22" fill="#67e8f9">(placeholder — GEMINI_API_KEY 설정 시 실제 일러스트 생성)</text>
</svg>`;
  writeFileSync(outPath, svg);
}

export async function generateCard({ photoPath, name, title, style = "royal" }) {
  if (!STYLES[style]) {
    throw new Error(`알 수 없는 스타일: ${style} (가능: ${Object.keys(STYLES).join(", ")})`);
  }
  mkdirSync("public/cards", { recursive: true });
  if (API_KEY) {
    const analyzed = await analyzeDog(photoPath, name, title);
    const outPath = path.join("public/cards", `${name}-${style}.png`);
    await generateCardImage(photoPath, analyzed.features, style, outPath);
    return { cardPath: outPath, title: analyzed.title };
  }
  const finalTitle = title || "전설의 친구";
  const outPath = path.join("public/cards", `${name}.svg`);
  placeholderCard(name, finalTitle, outPath);
  console.warn("⚠️  GEMINI_API_KEY가 없어 플레이스홀더 카드를 생성했습니다. (.env 또는 환경변수로 설정)");
  return { cardPath: outPath, title: finalTitle };
}

// CLI 실행
if (process.argv[1]?.endsWith("generate-card.mjs")) {
  const styleArg = process.argv.find((a) => a.startsWith("--style="));
  const style = styleArg ? styleArg.split("=")[1] : "royal";
  const [photoPath, name, title] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!photoPath || !name) {
    console.error(`사용법: node scripts/generate-card.mjs <사진경로> <강아지이름> [칭호] [--style=${Object.keys(STYLES).join("|")}]`);
    process.exit(1);
  }
  const { cardPath, title: t } = await generateCard({ photoPath, name, title, style });
  console.log(`✅ 카드 생성: ${cardPath} (칭호: ${t}, 스타일: ${style})`);
}

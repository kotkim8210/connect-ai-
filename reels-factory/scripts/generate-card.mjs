#!/usr/bin/env node
/**
 * 강아지 사진 → 미스틱 카드 이미지 생성.
 *
 * - GEMINI_API_KEY 있으면: Gemini 이미지 모델로 타로 카드 일러스트 생성 (+ 칭호 자동 생성)
 * - 없으면: 이름·칭호가 박힌 플레이스홀더 SVG 카드 생성 (파이프라인 검증용)
 *
 * CLI:  node scripts/generate-card.mjs <사진경로> <강아지이름> [칭호]
 * 출력: public/cards/<이름>.png(또는 .svg) — 콘솔에 reels.json용 props 조각 출력
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const CARD_PROMPT = (name, title) =>
  `Transform this dog photo into a mystical Korean-style tarot card illustration.
Style: cute Sanrio-inspired (K-cute), night sky with gold crescent moon and stars,
deep violet/indigo background (#2a1a5e to #0d0a2c), gold ornamental border,
the dog drawn as an adorable heroic character in the center, soft glow.
The card is titled "${title}" for a dog named "${name}".
Portrait orientation 3:4. No text or letters in the image.`;

async function gemini(model, body) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${model} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generateTitle(name) {
  const out = await gemini(TEXT_MODEL, {
    contents: [{
      parts: [{
        text: `강아지 "${name}"의 미스틱 카드 칭호를 1개만 만들어줘. 형식: 한국어 2~5글자 명사구 (예: 달빛 수호자, 불꽃의 모험가). 칭호만 출력.`,
      }],
    }],
  });
  return out.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/["\n]/g, "") ?? "전설의 친구";
}

async function generateCardImage(photoPath, name, title, outPath) {
  const imageB64 = readFileSync(photoPath).toString("base64");
  const mime = photoPath.endsWith(".png") ? "image/png" : "image/jpeg";
  const out = await gemini(IMAGE_MODEL, {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime, data: imageB64 } },
        { text: CARD_PROMPT(name, title) },
      ],
    }],
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

export async function generateCard({ photoPath, name, title }) {
  mkdirSync("public/cards", { recursive: true });
  if (API_KEY) {
    const finalTitle = title || (await generateTitle(name));
    const outPath = path.join("public/cards", `${name}.png`);
    await generateCardImage(photoPath, name, finalTitle, outPath);
    return { cardPath: outPath, title: finalTitle };
  }
  const finalTitle = title || "전설의 친구";
  const outPath = path.join("public/cards", `${name}.svg`);
  placeholderCard(name, finalTitle, outPath);
  console.warn("⚠️  GEMINI_API_KEY가 없어 플레이스홀더 카드를 생성했습니다. (.env 또는 환경변수로 설정)");
  return { cardPath: outPath, title: finalTitle };
}

// CLI 실행
if (process.argv[1].endsWith("generate-card.mjs")) {
  const [photoPath, name, title] = process.argv.slice(2);
  if (!photoPath || !name) {
    console.error("사용법: node scripts/generate-card.mjs <사진경로> <강아지이름> [칭호]");
    process.exit(1);
  }
  const { cardPath, title: t } = await generateCard({ photoPath, name, title });
  console.log(`✅ 카드 생성: ${cardPath} (칭호: ${t})`);
}

#!/usr/bin/env node
/**
 * 원커맨드 파이프라인: 강아지 사진 1장 → 카드 생성 → 15초 릴스 mp4.
 *
 * 사용법:
 *   node scripts/photo-to-reel.mjs <사진경로> <강아지이름> [칭호]
 *   예) node scripts/photo-to-reel.mjs public/photos/golden.jpg 해피 "태양의 전령"
 *
 * 출력: out/<강아지이름>.mp4 (1080x1920, 9:16, 15초)
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { generateCard } from "./generate-card.mjs";

const [photoArg, name, titleArg] = process.argv.slice(2);
if (!photoArg || !name) {
  console.error("사용법: node scripts/photo-to-reel.mjs <사진경로> <강아지이름> [칭호]");
  process.exit(1);
}
if (!existsSync(photoArg)) {
  console.error(`사진이 없습니다: ${photoArg}`);
  process.exit(1);
}

// 사진이 public/ 밖에 있으면 public/photos/로 복사 (staticFile은 public/만 접근 가능)
let photoPath = photoArg;
const pub = path.resolve("public");
if (!path.resolve(photoArg).startsWith(pub + path.sep)) {
  mkdirSync("public/photos", { recursive: true });
  photoPath = path.join("public/photos", path.basename(photoArg));
  copyFileSync(photoArg, photoPath);
  console.log(`📥 사진 복사: ${photoArg} → ${photoPath}`);
}

console.log(`🎨 카드 생성 중... (${name})`);
const { cardPath, title } = await generateCard({ photoPath, name, title: titleArg });
console.log(`   → ${cardPath} (칭호: ${title})`);

const props = {
  dogName: name,
  cardTitle: title,
  dogPhotoSrc: path.relative("public", photoPath).split(path.sep).join("/"),
  cardImageSrc: path.relative("public", cardPath).split(path.sep).join("/"),
  hookText: `${name}(이)가 전설의 캐릭터가 된다면?`,
  transformText: "AI가 운명의 카드를 그리는 중",
  ctaText: "📸 DM으로 강아지 사진 보내면\n무료로 만들어드려요!",
  handle: "@doggie.mystic",
};

mkdirSync("out", { recursive: true });
const outFile = path.join("out", `${name}.mp4`);
console.log(`🎬 릴스 렌더링 중... → ${outFile}`);
execFileSync(
  "npx",
  ["remotion", "render", "DoggieReel", outFile, `--props=${JSON.stringify(props)}`, "--timeout=120000"],
  { stdio: "inherit" },
);
console.log(`\n✅ 완료: ${outFile}`);

#!/usr/bin/env node
/**
 * 릴스 배치 렌더러 — reels.json의 항목마다 DoggieReel 15초 영상(mp4)을 렌더링.
 *
 * 사용법:
 *   cp reels.example.json reels.json   # 항목 편집 (사진은 public/에 넣기)
 *   node scripts/render-reels.mjs [reels.json]
 *
 * 결과: out/<id>.mp4 (1080x1920, 9:16)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const listPath = process.argv[2] ?? "reels.json";
if (!existsSync(listPath)) {
  console.error(`목록 파일이 없습니다: ${listPath}\n먼저 reels.example.json을 복사해 reels.json을 만드세요.`);
  process.exit(1);
}

const reels = JSON.parse(readFileSync(listPath, "utf8"));
mkdirSync("out", { recursive: true });

for (const { id, props } of reels) {
  const outFile = path.join("out", `${id}.mp4`);
  console.log(`\n▶ 렌더링: ${id} → ${outFile}`);
  execFileSync(
    "npx",
    ["remotion", "render", "DoggieReel", outFile, `--props=${JSON.stringify(props)}`, "--timeout=120000"],
    { stdio: "inherit" },
  );
}

console.log(`\n✅ 완료: ${reels.length}개 릴스가 out/ 폴더에 렌더링됐습니다.`);

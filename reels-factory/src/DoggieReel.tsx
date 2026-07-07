import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

// 로컬 폰트 (public/fonts/) — 네트워크 없이 렌더링 가능
loadFont({ family: "Jua", url: staticFile("fonts/Jua-Regular.ttf") });
loadFont({ family: "NanumPenScript", url: staticFile("fonts/NanumPenScript-Regular.ttf") });
loadFont({ family: "NotoSansKR", url: staticFile("fonts/NotoSansKR.ttf") });
const jua = { fontFamily: "Jua" };
const nanumPen = { fontFamily: "NanumPenScript" };
const noto = { fontFamily: "NotoSansKR" };

export const doggieReelSchema = z.object({
  dogName: z.string(),
  cardTitle: z.string(),
  dogPhotoSrc: z.string(),
  cardImageSrc: z.string(),
  hookText: z.string(),
  transformText: z.string(),
  ctaText: z.string(),
  handle: z.string(),
});

export type DoggieReelProps = z.infer<typeof doggieReelSchema>;

// 저장소 디자인 톤 가이드 팔레트 (PRESENTATION.md)
const C = {
  bg: "#050816",
  pink: "#ec4899",
  lavender: "#a78bfa",
  gold: "#fbbf24",
  cyan: "#67e8f9",
  cream: "#fef9f3",
};

const src = (s: string) => (s.startsWith("http") ? s : staticFile(s));

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 배경: 은은한 별 + 떠다니는 글리프 (전 구간 공통) */
const StarField: React.FC = () => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const glyphs = "명운복별빛달";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0d1230 0%, ${C.bg} 65%)` }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const x = random(`sx${i}`) * width;
        const y0 = random(`sy${i}`) * height;
        const y = (y0 + frame * (0.3 + random(`sv${i}`) * 0.8)) % height;
        const size = 2 + random(`ss${i}`) * 4;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / 20 + i));
        return (
          <div
            key={`s${i}`}
            style={{
              position: "absolute",
              left: x,
              top: height - y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? C.gold : i % 3 === 1 ? C.cyan : C.cream,
              opacity: 0.5 * tw,
            }}
          />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = random(`gx${i}`) * width;
        const y = (random(`gy${i}`) * height + frame * 0.6) % height;
        return (
          <div
            key={`g${i}`}
            style={{
              position: "absolute",
              left: x,
              top: height - y,
              fontFamily: nanumPen.fontFamily,
              fontSize: 40 + random(`gs${i}`) * 30,
              color: C.lavender,
              opacity: 0.14,
            }}
          >
            {glyphs[i % glyphs.length]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 마법 파티클: 중앙으로 수렴 (변신 구간) */
const ConvergingParticles: React.FC<{ progress: number }> = ({ progress }) => {
  const { width, height } = useVideoConfig();
  const cx = width / 2;
  const cy = height * 0.52;
  return (
    <AbsoluteFill>
      {Array.from({ length: 26 }).map((_, i) => {
        const angle = random(`pa${i}`) * Math.PI * 2;
        const r0 = 500 + random(`pr${i}`) * 400;
        const delay = random(`pd${i}`) * 0.4;
        const p = Math.min(1, Math.max(0, (progress - delay) / (1 - delay)));
        const r = r0 * (1 - p);
        const size = 8 + random(`ps${i}`) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx + Math.cos(angle + p * 2.5) * r,
              top: cy + Math.sin(angle + p * 2.5) * r,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 2 ? C.gold : C.pink,
              boxShadow: `0 0 ${size * 2}px ${i % 2 ? C.gold : C.pink}`,
              opacity: p > 0.97 ? 0 : 0.4 + p * 0.6,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** 카드 공개 순간 골드 버스트 */
const Burst: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(frame, [start, start + 35], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  if (t <= 0 || t >= 1) return null;
  return (
    <AbsoluteFill>
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2 + random(`ba${i}`);
        const dist = t * (300 + random(`bd${i}`) * 380);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width / 2 + Math.cos(angle) * dist,
              top: height * 0.5 + Math.sin(angle) * dist,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: [C.gold, C.pink, C.cyan, C.lavender][i % 4],
              boxShadow: `0 0 24px ${[C.gold, C.pink, C.cyan, C.lavender][i % 4]}`,
              opacity: 1 - t,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** ACT 1 — 훅: 강아지 사진 + 질문 (0~3s) */
const Hook: React.FC<{ photo: string; hookText: string }> = ({ photo, hookText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const textIn = interpolate(frame, [0.7 * fps, 1.5 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const wobble = Math.sin(frame / 9) * 2;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 640,
          height: 640,
          borderRadius: "50%",
          overflow: "hidden",
          border: `14px solid ${C.pink}`,
          boxShadow: `0 0 90px ${C.pink}88, 0 0 40px ${C.lavender}66`,
          transform: `scale(${pop}) rotate(${wobble}deg)`,
          marginTop: -260,
        }}
      >
        <Img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div
        style={{
          fontFamily: jua.fontFamily,
          fontSize: 92,
          color: C.cream,
          textAlign: "center",
          width: 900,
          lineHeight: 1.25,
          wordBreak: "keep-all",
          marginTop: 90,
          opacity: textIn,
          transform: `translateY(${(1 - textIn) * 70}px)`,
          textShadow: `0 4px 30px ${C.lavender}aa`,
        }}
      >
        {hookText}
      </div>
    </AbsoluteFill>
  );
};

/** ACT 2 — 변신: 파티클 수렴 + 카드 뒷면 회전 (3~8s) */
const Transform: React.FC<{ transformText: string }> = ({ transformText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, 4.2 * fps], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const spin = interpolate(frame, [0, 5 * fps], [0, 1080], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const glow = 40 + 50 * Math.abs(Math.sin(frame / 8)) + progress * 60;
  const enter = interpolate(frame, [0, 0.6 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dots = ".".repeat((Math.floor(frame / (0.4 * fps)) % 3) + 1);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <ConvergingParticles progress={progress} />
      <div style={{ perspective: 1600, transform: `scale(${enter})`, marginTop: -140 }}>
        <div
          style={{
            width: 620,
            height: 870,
            borderRadius: 36,
            transform: `rotateY(${spin}deg)`,
            background: `linear-gradient(145deg, #1b1145, #0d0a2c)`,
            border: `6px solid ${C.gold}`,
            boxShadow: `0 0 ${glow}px ${C.gold}77`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: nanumPen.fontFamily,
              fontSize: 190,
              color: C.gold,
              textShadow: `0 0 50px ${C.gold}`,
            }}
          >
            ?
          </div>
        </div>
      </div>
      <div
        style={{
          fontFamily: noto.fontFamily,
          fontWeight: 700,
          fontSize: 62,
          color: C.cyan,
          marginTop: 100,
          opacity: enter,
          textShadow: `0 0 30px ${C.cyan}99`,
        }}
      >
        {transformText}
        {dots}
      </div>
    </AbsoluteFill>
  );
};

/** ACT 3 — 공개: 카드 플립 + 이름 (8~13s) */
const Reveal: React.FC<{ card: string; dogName: string; cardTitle: string }> = ({ card, dogName, cardTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = interpolate(frame, [0, 0.9 * fps], [180, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const nameIn = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const shine = interpolate(frame, [1.2 * fps, 2.6 * fps], [-400, 1100], clamp);
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 36,
    backfaceVisibility: "hidden",
    overflow: "hidden",
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Burst start={Math.round(0.45 * fps)} />
      <div style={{ perspective: 1600, marginTop: -180 }}>
        <div
          style={{
            width: 660,
            height: 924,
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${flip}deg)`,
            filter: `drop-shadow(0 0 60px ${C.gold}66)`,
          }}
        >
          <div style={{ ...face, border: `6px solid ${C.gold}` }}>
            <Img src={card} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: shine,
                width: 170,
                background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)",
                transform: "skewX(-18deg)",
              }}
            />
          </div>
          <div
            style={{
              ...face,
              transform: "rotateY(180deg)",
              background: "linear-gradient(145deg, #1b1145, #0d0a2c)",
              border: `6px solid ${C.gold}`,
            }}
          />
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 70, opacity: nameIn, transform: `translateY(${(1 - nameIn) * 50}px)` }}>
        <div style={{ fontFamily: jua.fontFamily, fontSize: 96, color: C.gold, textShadow: `0 0 40px ${C.gold}88` }}>
          {dogName}
        </div>
        <div style={{ fontFamily: nanumPen.fontFamily, fontSize: 72, color: C.pink, marginTop: 8 }}>{cardTitle}</div>
      </div>
    </AbsoluteFill>
  );
};

/** ACT 4 — CTA (13~15s) */
const Cta: React.FC<{ ctaText: string; handle: string }> = ({ ctaText, handle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = interpolate(frame, [0, 0.6 * fps], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  const pulse = 1 + 0.03 * Math.sin(frame / 5);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${C.pink}, ${C.lavender})`,
          borderRadius: 44,
          padding: "56px 72px",
          maxWidth: 920,
          textAlign: "center",
          transform: `translateY(${(1 - up) * 300}px) scale(${up * pulse})`,
          boxShadow: `0 0 80px ${C.pink}88`,
        }}
      >
        <div
          style={{
            fontFamily: jua.fontFamily,
            fontSize: 74,
            color: "#fff",
            lineHeight: 1.3,
            whiteSpace: "pre-line",
            wordBreak: "keep-all",
          }}
        >
          {ctaText}
        </div>
      </div>
      <div
        style={{
          fontFamily: noto.fontFamily,
          fontWeight: 900,
          fontSize: 52,
          color: C.cream,
          marginTop: 60,
          opacity: up,
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};

export const DoggieReel: React.FC<DoggieReelProps> = (props) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [14.4 * fps, 15 * fps], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <StarField />
      <Sequence durationInFrames={3 * fps}>
        <Hook photo={src(props.dogPhotoSrc)} hookText={props.hookText} />
      </Sequence>
      <Sequence from={3 * fps} durationInFrames={5 * fps}>
        <Transform transformText={props.transformText} />
      </Sequence>
      <Sequence from={8 * fps} durationInFrames={5 * fps}>
        <Reveal card={src(props.cardImageSrc)} dogName={props.dogName} cardTitle={props.cardTitle} />
      </Sequence>
      <Sequence from={13 * fps}>
        <Cta ctaText={props.ctaText} handle={props.handle} />
      </Sequence>
    </AbsoluteFill>
  );
};

import "./index.css";
import { Composition } from "remotion";
import { DoggieReel, doggieReelSchema } from "./DoggieReel";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DoggieReel"
        component={DoggieReel}
        durationInFrames={15 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        schema={doggieReelSchema}
        defaultProps={{
          dogName: "몽실이",
          cardTitle: "달빛 수호자",
          dogPhotoSrc: "sample-dog.svg",
          cardImageSrc: "sample-card.svg",
          hookText: "우리 강아지가 전설의 캐릭터가 된다면?",
          transformText: "AI가 운명의 카드를 그리는 중",
          ctaText: "📸 DM으로 강아지 사진 보내면\n무료로 만들어드려요!",
          handle: "@doggie.mystic",
        }}
      />
    </>
  );
};

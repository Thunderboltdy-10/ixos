import "./index.css";
import { Composition } from "remotion";
import { HeroFilm } from "./compositions/HeroFilm";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Primary: 16:9 hero film — 38 seconds */}
      <Composition
        id="HeroFilm"
        component={HeroFilm}
        durationInFrames={1140}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

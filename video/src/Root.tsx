import React from "react";
import { Composition } from "remotion";
import { Explainer } from "./Explainer";
import timeline from "./timeline.json";
import { CastTest } from "./v2/CastTest";
import { Film, FILM_FRAMES } from "./v2/Film";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={30} width={1280} height={720} />
    <Composition
      id="Explainer"
      component={Explainer}
      durationInFrames={timeline.totalFrames}
      fps={timeline.fps}
      width={1280}
      height={720}
    />
    <Composition id="CastTest" component={CastTest} durationInFrames={60} fps={30} width={1280} height={720} />
  </>
);

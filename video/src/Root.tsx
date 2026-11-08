import { Composition } from "remotion";
import { EndCard } from "./scenes/EndCard";
import { NestVertical } from "./NestVertical";
import { FPS } from "./theme";
import { TOTAL_FRAMES } from "./timeline";
import { Opening, OPENING_FPS, OPENING_FRAMES } from "./opening/Opening";
import { Film } from "./film/Film";
import { FILM_FPS, FILM_FRAMES, FILM_H, FILM_W } from "./film/timeline";

/**
 * Two cuts of the Nest demo video (see VIDEO_SCRIPT.md and app-design/storyboard.html).
 * Both stay under the 90-second limit. NestWide still shows the end card only.
 */
export const Root = () => (
  <>
    <Composition id="NestVertical" component={NestVertical} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="NestWide" component={EndCard} durationInFrames={68 * FPS} fps={FPS} width={1920} height={1080} />
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FILM_FPS} width={FILM_W} height={FILM_H} />
    <Composition id="Opening" component={Opening} durationInFrames={OPENING_FRAMES} fps={OPENING_FPS} width={1920} height={1080} />
  </>
);

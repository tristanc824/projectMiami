import { Composition } from "remotion";
import { EndCard } from "./scenes/EndCard";

const FPS = 30;

/**
 * Two cuts of the Nest demo video (see VIDEO_SCRIPT.md and app-design/storyboard.html).
 * Both stay under the 90-second limit. Scenes are added beat by beat; for now both
 * compositions show the end card so the toolchain can be tested.
 */
export const Root = () => (
  <>
    <Composition id="NestVertical" component={EndCard} defaultProps={{ publicUrl: '' }} durationInFrames={53 * FPS} fps={FPS} width={1080} height={1920} />
    <Composition id="NestWide" component={EndCard} defaultProps={{ publicUrl: '' }} durationInFrames={68 * FPS} fps={FPS} width={1920} height={1080} />
  </>
);

import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Figtree";

const { fontFamily } = loadFont();

/** Beat 12: the Nest mark and tagline over the meadow (storyboard frame 12). */
export const EndCard = () => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 24], [24, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fade = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const push = interpolate(frame, [0, 150], [1, 1.06], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#16301D", fontFamily }}>
      <Img src={staticFile("meadow.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "45% 75%", transform: `scale(${push})` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(16,26,19,0.45), rgba(16,26,19,0) 55%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "white", opacity: fade, transform: `translateY(${rise}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 110, fontWeight: 600, letterSpacing: "-0.03em" }}>
          <svg viewBox="0 0 64 64" width={120} height={120}>
            <g fill="none" stroke="white" strokeWidth={5.5}>
              <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)" />
              <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)" />
              <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)" />
            </g>
          </svg>
          Nest
        </div>
        <div style={{ marginTop: 28, fontSize: 64, fontWeight: 600, letterSpacing: "-0.025em" }}>Protect what matters.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

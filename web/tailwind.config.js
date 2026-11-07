/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Guard brand kit
        carbon: "#0A0B0D",
        panel: "#111318",
        slate: "#5B616E",
        dim: "#8A8F98",
        cloud: "#EEF0F3",
        sky: "#7DB4FF",
        guard: { DEFAULT: "#0052FF", 400: "#2F6BFF", 300: "#7DB4FF", 50: "#EEF4FF" },
        mint: "#30D158",
        // light tokens used inside the phone screens
        ink: "#1D1D1F",
        faint: "#86868B",
        hair: "#D2D2D7",
        mist: "#F5F5F7",
      },
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"Segoe UI"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Consolas", "monospace"],
      },
      letterSpacing: { tightest: "-0.045em" },
      keyframes: {
        breathe: { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "0.9" } },
        "orb-breathe": { "0%,100%": { opacity: "0.7", transform: "scale(0.96)" }, "50%": { opacity: "1", transform: "scale(1.04)" } },
        "phone-float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
      },
      animation: {
        breathe: "breathe 8s ease-in-out infinite",
        "orb-breathe": "orb-breathe 7s ease-in-out infinite",
        "phone-float": "phone-float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

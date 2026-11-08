/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nest, earth edition. Flat colors only: no gradients, glows or glass.
        page: "#F3F0EA", // warm off-white page
        ink: { DEFAULT: "#17201A", 600: "#4A544D", 400: "#7C857E" },
        moss: { DEFAULT: "#2F5D3A", 700: "#244A2E", 900: "#16301D" },
        sage: { DEFAULT: "#A9C4A1", 100: "#E4ECDF" },
        sky: { DEFAULT: "#8CC8EA", 100: "#DCEEF8" },
        sand: { DEFAULT: "#E9E1D1", 300: "#D8CCB4" },
        line: "#DDD7CA",
        gold: "#D9A441",
      },
      fontFamily: {
        sans: ['"Figtree"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
    },
  },
  plugins: [],
};

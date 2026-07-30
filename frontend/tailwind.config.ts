import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f4ff",
          100: "#e4e8ff",
          400: "#7c8bff",
          500: "#5b6bf5",
          600: "#4451dd",
          700: "#3540b3",
        },
        emo: {
          anger: "#ef4444",
          frustration: "#f97316",
          sadness: "#60a5fa",
          anxiety: "#a78bfa",
          calm: "#34d399",
          neutral: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulseSlow: "pulseSlow 1.4s ease-in-out infinite",
        bob: "bob 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

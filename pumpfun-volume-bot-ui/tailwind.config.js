import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        monospace: [
          "monospace",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
        ],
        segoe: ['"Segoe UI"', "Arial", "sans-serif"],
        arial: ["Arial", '"Arial"'],
      },
      height: {
        "custom-calc": "calc(100vh - 64px - 1.75rem)",
      },
      backgroundImage: {
        "gradient-button":
          "linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.04) 100%)",
      },
      zIndex: {
        100: "100",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

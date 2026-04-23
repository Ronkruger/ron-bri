/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        boy: {
          primary: "#3B82F6",
          light: "#EFF6FF",
          accent: "#1D4ED8",
          muted: "#BFDBFE",
        },
        girl: {
          primary: "#EAB308",
          light: "#FEFCE8",
          accent: "#A16207",
          muted: "#FEF08A",
        },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

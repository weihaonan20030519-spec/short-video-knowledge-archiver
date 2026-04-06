import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Noto Sans SC", "PingFang SC", "sans-serif"]
      },
      colors: {
        ink: "#0f172a",
        panel: "#f8fafc",
        accent: "#0f766e",
        warm: "#f59e0b"
      },
      boxShadow: {
        panel: "0 18px 42px rgba(15, 23, 42, 0.12)",
        subtle: "0 6px 18px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;

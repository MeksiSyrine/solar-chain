/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#080C14",
          surface: "#0D1420",
          elevated: "#111827",
          overlay: "#1A2235"
        },
        solar: {
          100: "#FFF8E7",
          300: "#FFD97D",
          400: "#FFC53D",
          500: "#F59E0B",
          600: "#D97706",
          glow: "rgba(245,158,11,0.15)",
          emerald: "#10b981",
          amber: "#f59e0b",
          night: "#0f172a"
        },
        green: {
          400: "#34D399",
          500: "#10B981",
          glow: "rgba(16,185,129,0.12)"
        },
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
          muted: "#475569"
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          solar: "rgba(245,158,11,0.25)",
          green: "rgba(16,185,129,0.25)"
        }
      },
      boxShadow: {
        "solar-glow": "0 0 24px rgba(245,158,11,0.3)",
        "solar-soft": "0 0 30px rgba(245,158,11,0.08)",
        "green-glow": "0 0 24px rgba(16,185,129,0.22)"
      },
      keyframes: {
        "pulse-green": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.5)" }
        },
        "solar-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245,158,11,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(245,158,11,0.6)" }
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "pulse-green": "pulse-green 1.6s ease-in-out infinite",
        "solar-glow": "solar-glow 1.6s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "fade-in-up": "fade-in-up 0.4s ease forwards"
      }
    }
  },
  plugins: []
};

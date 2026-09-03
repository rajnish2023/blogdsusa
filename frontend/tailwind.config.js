/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14161F",
          soft: "#1E2130",
          border: "#2A2E42",
        },
        paper: {
          DEFAULT: "#F6F5F2",
          card: "#FFFFFF",
          line: "#E7E4DC",
        },
        signal: {
          DEFAULT: "#3355FF",
          hover: "#2545E8",
          soft: "#EAEDFF",
        },
        flare: {
          DEFAULT: "#FF6A3D",
          soft: "#FFE9DF",
        },
        success: "#16A34A",
        danger: "#DC2626",
        muted: "#6B7280",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,22,31,0.04), 0 4px 16px rgba(20,22,31,0.06)",
        pop: "0 8px 30px rgba(20,22,31,0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        scaleIn: { "0%": { opacity: 0, transform: "scale(0.96)" }, "100%": { opacity: 1, transform: "scale(1)" } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)",
        slideUp: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

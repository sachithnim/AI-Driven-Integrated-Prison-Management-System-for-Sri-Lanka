/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff", // very light blue
          100: "#dbeafe", // pale blue
          200: "#bfdbfe", // soft blue
          300: "#93c5fd", // light blue
          400: "#60a5fa", // bright blue
          500: "#3b82f6", // main brand blue (professional)
          600: "#2563eb", // darker blue for hover states
          700: "#1d4ed8", // rich blue for active states
          800: "#1e40af", // deep blue for contrast
          900: "#1e3a8a", // darkest blue tone
        },
        dark: {
          50: "#f8fafc", // very light gray (almost white)
          100: "#f1f5f9", // pale gray
          200: "#e2e8f0", // soft gray
          300: "#cbd5e1", // light gray
          400: "#94a3b8", // medium gray
          500: "#64748b", // neutral gray
          600: "#475569", // darker gray
          700: "#334155", // charcoal
          800: "#1e293b", // dark charcoal
          900: "#0f172a", // near black
          950: "#020617", // pure black tone
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
}


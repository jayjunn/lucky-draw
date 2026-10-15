import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          400: "#FACC15",
          500: "#EAB308",
          600: "#CA8A04",
        },
        vip: {
          purple: "#7C3AED",
          indigo: "#4F46E5",
          dark: "#0F172A",
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'bounce-soft': 'bounceSoft 2s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(234, 179, 8, 0.4), 0 0 30px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(234, 179, 8, 0.8), 0 0 50px rgba(124, 58, 237, 0.6)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: { "2xl": "1440px" },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      wide: "1440px",
    },
    extend: {
      fontSize: {
        // Fluid type scale — single source of truth, clamp(min, vw, max)
        "fs-xs":   ["clamp(0.72rem, 0.68rem + 0.20vw, 0.80rem)", { lineHeight: "1.45" }],
        "fs-sm":   ["clamp(0.82rem, 0.78rem + 0.25vw, 0.92rem)", { lineHeight: "1.5" }],
        "fs-base": ["clamp(0.95rem, 0.90rem + 0.30vw, 1.06rem)", { lineHeight: "1.6" }],
        "fs-lg":   ["clamp(1.08rem, 1.00rem + 0.45vw, 1.25rem)", { lineHeight: "1.5" }],
        "fs-xl":   ["clamp(1.25rem, 1.10rem + 0.75vw, 1.55rem)", { lineHeight: "1.35" }],
        "fs-2xl":  ["clamp(1.50rem, 1.25rem + 1.20vw, 2.00rem)", { lineHeight: "1.25" }],
        "fs-3xl":  ["clamp(1.85rem, 1.50rem + 1.80vw, 2.65rem)", { lineHeight: "1.15" }],
        "fs-4xl":  ["clamp(2.25rem, 1.75rem + 2.50vw, 3.50rem)", { lineHeight: "1.05" }],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "nav-h": "var(--nav-h)",
        "pad-x": "var(--pad-x)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      maxWidth: {
        app: "var(--app-max-w)",
      },
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
        display: ['Heebo', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          foreground: "hsl(var(--gold-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-navy-deep': 'var(--gradient-navy-deep)',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'floating': 'var(--shadow-floating)',
        'gold': 'var(--shadow-gold)',
        'glow-gold': 'var(--glow-gold)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        '2xl': "1.25rem",
        '3xl': "1.75rem",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s cubic-bezier(0.4,0,0.2,1) both",
        "shimmer": "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

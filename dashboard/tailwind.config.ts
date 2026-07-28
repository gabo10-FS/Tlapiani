import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondos
        bg:          "#F1F5F9",
        surface:     "#FFFFFF",
        panel:       "#F8FAFC",
        row:         "#F1F5F9",
        "row-hover": "#E2E8F0",

        // Bordes
        border:      "#E2E8F0",
        "border-hi": "#CBD5E1",

        // Texto
        "c-text":    "#0F172A",
        dim:         "#64748B",
        mute:        "#CBD5E1",

        // Sidebar oscuro
        sidebar:     "#0F172A",
        "sidebar-2": "#1E293B",
        "sidebar-border": "#1E293B",
        "sidebar-text":   "#94A3B8",
        "sidebar-active": "#0EA5E9",

        // Primario — Azul cielo
        primary:          "#0EA5E9",
        "primary-light":  "#E0F2FE",
        "primary-dark":   "#0369A1",

        // Secundario — Esmeralda
        secondary:        "#10B981",
        "secondary-light":"#D1FAE5",
        "secondary-dark": "#065F46",

        // Acento — Violeta
        accent:           "#8B5CF6",
        "accent-light":   "#EDE9FE",

        // Estados semáforo
        critica:   "#EF4444",
        alta:      "#F97316",
        media:     "#F59E0B",
        baja:      "#10B981",
        segura:    "#059669",

        // Alias
        "terra-light": "#FEE2E2",
        "primary-900": "#0C4A6E",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'Courier New'", "monospace"],
      },
      borderRadius: {
        sm:    "6px",
        DEFAULT: "8px",
        md:    "10px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        full:  "9999px",
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4" }],
        xs:    ["12px", { lineHeight: "1.5" }],
        sm:    ["13px", { lineHeight: "1.6" }],
        base:  ["14px", { lineHeight: "1.6" }],
        md:    ["15px", { lineHeight: "1.6" }],
        lg:    ["17px", { lineHeight: "1.5" }],
        xl:    ["20px", { lineHeight: "1.4" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["30px", { lineHeight: "1.2" }],
      },
      boxShadow: {
        card:  "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        md:    "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        lg:    "0 10px 25px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.05)",
        sidebar: "2px 0 8px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;

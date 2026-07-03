/**
 * CGEO+ Design Tokens
 * Fonte única de verdade para cores, espaçamentos, tipografia e elevação.
 * Consumido por Tailwind (via CSS variables) e componentes React.
 */

export const colors = {
  light: {
    bg: "#FFFFFF",
    surface: "#FAFAFA",
    elevated: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.06)",
    borderStrong: "rgba(0, 0, 0, 0.12)",
    text: "#0A0A0A",
    textMuted: "#6B7280",
    textSubtle: "#9CA3AF",
    accent: "#0071E3",
    accentHover: "#0077ED",
    success: "#30D158",
    warning: "#FF9F0A",
    danger: "#FF453A",
    n1: "#30D158",
    n2: "#FF9F0A",
    n3: "#FF453A",
  },
  dark: {
    bg: "#000000",
    surface: "#0A0A0A",
    elevated: "#1C1C1E",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.16)",
    text: "#FFFFFF",
    textMuted: "#8E8E93",
    textSubtle: "#636366",
    accent: "#0A84FF",
    accentHover: "#409CFF",
    success: "#32D74B",
    warning: "#FF9F0A",
    danger: "#FF453A",
    n1: "#32D74B",
    n2: "#FF9F0A",
    n3: "#FF453A",
  },
} as const;

export const radii = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  "2xl": "28px",
  full: "9999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    display: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  },
  size: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "32px",
    "4xl": "40px",
    "5xl": "56px",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  tracking: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.02em",
    wider: "0.08em",
  },
} as const;

export const elevation = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.10)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
} as const;

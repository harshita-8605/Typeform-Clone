// Typeform visual constants — single source of truth.
// Mirrored as CSS variables in globals.css :root for Tailwind.
// System font stacks avoid a build-time dependency on an external font provider.

export const TF_COLORS = {
  purple: "#601FEE",
  purpleLight: "#A78BFA",
  purpleDark: "#4312AC",
  purpleSubtle: "#F1EBFF",
  bg: "#FAF9FC",
  canvas: "#FFFFFF",
  text: "#1D1D1F",
  muted: "#777777",
  border: "#ECECF1",
  borderStrong: "#D7D7E0",
  error: "#DC2626",
  success: "#16A34A",
} as const;

export const TF_RADIUS = {
  card: "24px",
  input: "16px",
  pill: "9999px",
  menu: "12px",
  toast: "8px",
} as const;

export const TF_SHADOWS = {
  card: "0 1px 2px rgba(0,0,0,0.04)",
  cardHover: "0 6px 20px rgba(0,0,0,0.06)",
  modal: "0 20px 60px rgba(0,0,0,0.12)",
  focus: "0 0 0 3px rgba(96,31,238,0.12)",
  toast: "0 4px 16px rgba(0,0,0,0.06)",
} as const;

export const TF_FONTS = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, ui-serif, serif",
  sizes: {
    body: "16px",
    label: "14px",
    small: "13px",
  },
} as const;

export const TF_SPACING = {
  sectionGap: "40px",
  cardGap: "24px",
  formPad: "24px",
} as const;

// Gradient thumbnail palette for workspace form cards (durable, form-id deterministic)
export const TF_CARD_GRADIENTS = [
  "linear-gradient(135deg,#601FEE 0%,#A78BFA 100%)",
  "linear-gradient(135deg,#0EA5E9 0%,#22D3EE 100%)",
  "linear-gradient(135deg,#10B981 0%,#34D399 100%)",
  "linear-gradient(135deg,#F59E0B 0%,#F43F5E 100%)",
  "linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)",
  "linear-gradient(135deg,#06B6D4 0%,#6366F1 100%)",
];

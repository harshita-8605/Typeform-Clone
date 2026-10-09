/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--tf-purple) / <alpha-value>)",
          light: "rgb(var(--tf-purple-light) / <alpha-value>)",
          dark: "rgb(var(--tf-purple-dark) / <alpha-value>)",
          subtle: "rgb(var(--tf-purple-subtle) / <alpha-value>)",
        },
        tf: {
          purple: "rgb(var(--tf-purple) / <alpha-value>)",
          "purple-light": "rgb(var(--tf-purple-light) / <alpha-value>)",
          "purple-dark": "rgb(var(--tf-purple-dark) / <alpha-value>)",
          "purple-subtle": "rgb(var(--tf-purple-subtle) / <alpha-value>)",
          bg: "rgb(var(--tf-bg) / <alpha-value>)",
          canvas: "rgb(var(--tf-canvas) / <alpha-value>)",
          text: "rgb(var(--tf-text) / <alpha-value>)",
          muted: "rgb(var(--tf-muted) / <alpha-value>)",
          border: "rgb(var(--tf-border) / <alpha-value>)",
          "border-strong": "rgb(var(--tf-border-strong) / <alpha-value>)",
          error: "rgb(var(--tf-error) / <alpha-value>)",
          success: "rgb(var(--tf-success) / <alpha-value>)",
        },
        // legacy aliases for existing code
        surface: {
          DEFAULT: "rgb(var(--tf-bg) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--tf-text) / <alpha-value>)",
          secondary: "rgb(var(--tf-muted) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--tf-error) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--tf-success) / <alpha-value>)",
        },
        background: {
          DEFAULT: "rgb(var(--tf-canvas) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "ui-serif", "serif"],
        display: ["Georgia", "ui-serif", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        card: "24px",
        pill: "9999px",
        menu: "12px",
        toast: "8px",
      },
      boxShadow: {
        card: "var(--tf-shadow-card)",
        hover: "var(--tf-shadow-hover)",
        modal: "var(--tf-shadow-modal)",
        focus: "var(--tf-shadow-focus)",
        toast: "var(--tf-shadow-toast)",
      },
      borderWidth: {
        3: "3px",
      },
      keyframes: {
        "toast-slide-in": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "toast-slide-out": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
        "checkmark-draw": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "circle-draw": {
          "0%": { strokeDashoffset: "300" },
          "100%": { strokeDashoffset: "0" },
        },
        "lift-in": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "toast-slide-in": "toast-slide-in 0.3s ease-out",
        "toast-slide-out": "toast-slide-out 0.3s ease-in forwards",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in forwards",
        shake: "shake 0.45s cubic-bezier(.36,.07,.19,.97) both",
        "checkmark-draw": "checkmark-draw 0.5s 0.3s ease-out forwards",
        "circle-draw": "circle-draw 0.6s ease-out forwards",
        "lift-in": "lift-in 0.3s cubic-bezier(.22,1,.36,1) both",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".tf-focus-line-left": {
          position: "relative",
        },
        ".tf-focus-line-left::before": {
          content: "''",
          position: "absolute",
          left: "-24px",
          top: "0",
          bottom: "0",
          width: "4px",
          borderRadius: "4px",
          backgroundColor: "rgb(var(--tf-purple))",
        },
        ".tf-scrollbar-hidden": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".tf-scrollbar-hidden::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};

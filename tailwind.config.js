/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: "#6F4EF2",
          light: "#A78BFA",
          soft: "#EDE9FE",
        },
        coffee: {
          dark: "#5A3E2B",
          DEFAULT: "#8B6B4A",
          light: "#C4A484",
        },
        background: "#F9FAFB",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        text: {
          primary: "#1F2937",
          secondary: "#6B7280",
        },
        success: "#86EFAC",
        danger: "#FCA5A5",
        warning: "#FDE68A",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.05)",
        card: "0 8px 30px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
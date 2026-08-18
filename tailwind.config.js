/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        lg: "20px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};

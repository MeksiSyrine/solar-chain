/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        solar: {
          emerald: "#10b981",
          amber: "#f59e0b",
          night: "#0f172a"
        }
      }
    }
  },
  plugins: []
};

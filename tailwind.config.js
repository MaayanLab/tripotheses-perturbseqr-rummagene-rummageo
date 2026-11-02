/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui"],
      mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [{
      tripothesis: {
        primary: '#244A92',
        secondary: '#5A3A98',
        accent: '#2497C5',
        neutral: '#182B63',
        'base-100': '#FFFFFF',
        'base-200': '#EEF7FB',
        'base-300': '#DDE9F2',
        info: '#34B8D4',
        success: '#167A52',
        warning: '#A15C00',
        error: '#B42318',
      },
    }],
  },
}

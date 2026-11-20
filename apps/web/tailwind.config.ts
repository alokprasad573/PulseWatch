import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#101112', // Obsidian
        sidebar: '#151617',    // Deep Charcoal
        card: '#1B1C1E',       // Graphite
        surface: '#222326',    // Dark Graphite
        accent: {
          DEFAULT: '#D6BD91',  // Champagne
          hover: '#C2A77A',
          secondary: '#A8895D' // Bronze
        },
        foreground: {
          DEFAULT: '#F4F1EA',  // Warm Ivory
          secondary: '#A5A29B',// Stone Grey
          muted: '#77756F',    // Ash Grey
        },
        border: '#30302E',     // Warm Charcoal Border
        status: {
          up: '#57A97A',       // Muted Sage
          down: '#E05D5D',     // Muted Crimson
          warning: '#D4A359',  // Amber
          paused: '#77756F',   // Ash Grey
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

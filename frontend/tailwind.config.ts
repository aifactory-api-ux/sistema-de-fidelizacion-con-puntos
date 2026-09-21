import type { Config } from 'tailwindcss';

// Tokens tomados del Design Implementation Contract (UI/UX Agent) del proyecto.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007A5E',
          light: '#E6F2F0',
        },
        ink: {
          DEFAULT: '#1D2939', // text_main
          secondary: '#475467', // text_secondary
        },
        surface: '#F7FAFC',
        navy: {
          DEFAULT: '#0E1A33',
          deep: '#0E1F38',
          darker: '#131C2E',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

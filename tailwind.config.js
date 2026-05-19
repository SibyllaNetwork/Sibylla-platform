/** @type {import('tailwindcss').Config} */
//
// Design tokens Sibylla — allineati a src/styles/_colors.sass e src/core/tokens.ts.
// I colori puntano alle CSS custom properties definite in src/styles/_themes.sass,
// quindi le classi Tailwind (bg-primary-900, text-link, ecc.) reagiscono
// automaticamente al tema applicato su [data-theme] dell'elemento <html>.
//
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/flowbite-react/lib/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          900: 'var(--color-primary-900)',
          800: 'var(--color-primary-800)',
          700: 'var(--color-primary-700)',
          600: 'var(--color-primary-600)',
          500: 'var(--color-primary-500)',
          400: 'var(--color-primary-400)',
          300: 'var(--color-primary-300)',
          200: 'var(--color-primary-200)',
          100: 'var(--color-primary-100)',
          50:  'var(--color-primary-50)',
        },

        link: {
          DEFAULT: 'var(--color-link)',
          light:   'var(--color-link-light)',
        },
        accent: 'var(--color-accent)',

        success: {
          DEFAULT: 'var(--color-success-mid)',
          dark:    'var(--color-success)',
          light:   'var(--color-success-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          dark:    'var(--color-error-dark)',
          light:   'var(--color-error-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light:   'var(--color-warning-light)',
        },

        ink: {
          DEFAULT: 'var(--color-text-active)',
          muted:   'var(--color-text-inactive)',
          subtle:  'var(--color-text-disabled)',
          inverse: 'var(--color-text-negative)',
        },

        canvas: 'var(--color-bg)',
        line:   'var(--color-border)',

        // ── Alias Newagora/Agorà (sub-app modules/purchasing/Agora) ──
        // Mappiamo i token usati nei .css portati da Newagora ai tema Sibylla,
        // così @apply continua a funzionare senza dover riscrivere ogni CSS.
        surface: {
          DEFAULT: 'var(--color-surface, #ffffff)',
          subtle:  'var(--color-bg, #f8fcff)',
          muted:   '#f7f7f7',
        },
        border:        'var(--color-border, #cfcfcf)',
        'border-soft': 'var(--color-border, #dbdbdb)',
        'link-soft':   'var(--color-link-light, #f0f5f8)',
        text: {
          active:   'var(--color-text-active)',
          inactive: 'var(--color-text-inactive)',
          disabled: 'var(--color-text-disabled)',
          negative: 'var(--color-text-negative)',
          heading:  'var(--color-text-disabled)',
        },
        confirm: {
          50:   '#e4f8ee',
          200:  '#00cf86',
          500:  '#00fc86',
          700:  '#007035',
          soft: '#bdeed4',
        },
        danger: {
          50:  '#ffeaef',
          300: '#ff616e',
          900: '#d10011',
        },
        alert: {
          50:  '#fff3e0',
          200: '#ffcc81',
          700: '#f57d03',
        },
        disabled: '#e9eaed',
        sidenav: {
          bg:     '#204769',
          active: '#244f75',
          icon:   '#f7f7f7',
        },
      },
      fontFamily: {
        poppins:  ['Poppins', 'sans-serif'],
        opensans: ['Open Sans', 'sans-serif'],
        heading:  ['var(--font-heading)'],
        body:     ['var(--font-body)'],
      },
      borderRadius: {
        field:   '6px',
        card:    '15px',
        control: '6px',
      },
      height: {
        field: '34px',
      },
      fontSize: {
        field: ['14px', '20px'],

        // ── Scala tipografica Newagora (Headings + Paragraphs + Labels) ──
        h1: ['2rem',     { lineHeight: '2.1875rem' }],   // 32 / 35
        h2: ['1.5rem',   { lineHeight: '1.875rem'  }],   // 24 / 30
        h3: ['1.125rem', { lineHeight: '1.3125rem' }],   // 18 / 21
        h4: ['0.875rem', { lineHeight: '0.875rem'  }],   // 14
        h5: ['1rem',     { lineHeight: '1.1875rem' }],   // 16 / 19
        h6: ['0.625rem', { lineHeight: '0.875rem'  }],   // 10 / 14
        p1: ['0.875rem', { lineHeight: '1.25rem'   }],   // 14 / 20
        p3: ['0.8125rem',{ lineHeight: '1.125rem'  }],
        p5: ['1rem',     { lineHeight: '1.25rem'   }],
        p6: ['0.6875rem',{ lineHeight: '0.875rem'  }],
        l1: ['0.875rem', { lineHeight: '1.375rem'  }],
      },
      screens: {
        '3xl': '1525px',
      },
      transitionTimingFunction: {
        'sidebar': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

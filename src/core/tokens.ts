// Token del design system — alias di CSS custom properties definite in
// src/styles/_themes.sass. Tutti i valori sono `var(--...)` così gli inline
// style React (style={{ background: T.primary }}) cambiano col tema corrente
// scritto in [data-theme] sull'elemento <html>.

const T = {
  primary:       "var(--color-primary)",
  primary800:    "var(--color-primary-800)",
  primary100:    "var(--color-primary-100)",
  blue:          "var(--color-link)",
  blueLight:     "var(--color-link-light)",
  accent:        "var(--color-accent)",
  textActive:    "var(--color-text-active)",
  textInactive:  "var(--color-text-inactive)",
  textDisabled: "var(--color-text-disabled)",
  success:       "var(--color-success)",
  successLight: "var(--color-success-light)",
  successMid:    "var(--color-success-mid)",
  error:         "var(--color-error)",
  errorLight:    "var(--color-error-light)",
  warning:       "var(--color-warning)",
  warningLight: "var(--color-warning-light)",
  bg:            "var(--color-bg)",
  white:         "var(--color-surface)",
  border:        "var(--color-border)",
};
export default T;

---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# UI

- Build UI from shadcn/ui components. Add them with the shadcn CLI rather than writing primitives by hand; they land in `src/components/ui/`.
- Keep `src/components/ui/` close to what the CLI generated. Put app-specific composition in feature components, not in the primitives.
- Style with Tailwind utilities and the theme tokens (CSS variables) only. No SCSS modules, no CSS-in-JS, no hard-coded colors.
- Every screen must work in light and dark theme if a theme switch exists.
- This is a staff tool: favor dense, scannable layouts and keyboard-friendly forms over marketing-style spacing.

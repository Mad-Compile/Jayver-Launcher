# Jayver Launcher

React + TypeScript + Vite frontend with Tailwind CSS v4 and shadcn/ui-compatible structure.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## UI component locations

- Reusable shadcn-style components: `src/components/ui`
- Demo screens: `src/components/demos`
- Shared utilities: `src/lib`
- Global styles: `src/index.css`

The `@/` alias maps to `src/`. Keep reusable UI primitives in `src/components/ui` so shadcn CLI additions and project imports use one predictable location.

## Add shadcn components

```bash
npx shadcn@latest add button
```

The project is configured in `components.json` and uses Tailwind CSS v4 through the Vite plugin.

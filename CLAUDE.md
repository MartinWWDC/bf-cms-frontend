# CLAUDE.md

@AGENTS.md

## Project

`bf-cms-frontend` is the internal CMS / admin frontend for BikeFlip, a used bike marketplace (bikes, components, clothing). It is used by staff, not by the public. It deploys to Vercel from `main`.

The project is at an early stage: the app shell and a generic resource screen exist and run on mock data. There is no auth and no real API connection yet.

## Related projects

Sibling checkouts, readable from this session (see `.claude/settings.json`). Treat them as reference only: never edit them from here.

| Project | Path | What it is |
| --- | --- | --- |
| `bf-backend` | `../bf-backend` | Laravel repo. The CMS API is its self-contained `cms/` module (namespace `Cms\`, routes under `/cms/v1`), run as its own service. The marketplace API (`/api/v1`) is not what this app talks to. |
| `bf-frontend` | `../bf-frontend` | Public marketplace site (Next.js Pages Router, SCSS modules, SWR). Useful for domain knowledge only; it is a different stack and uses cookie auth, so do not copy its conventions or API client. |

## CMS backend (Linear project P-BIK-77)

**Living plan:** "Custom CMS Build Plan" — https://claude.ai/artifact/4EMeA9kA9VspRx6VyR1RGW

The plan is updated often and is the authority on backend status, decisions and frontend tasks. Read it with the Artifact tool (`action: "read"`, not a web fetch) before starting any work that touches auth, the API, the resource contract or screen behaviour. The summary below is a snapshot of Draft 4 (18 Nov 2026) and may be stale: if the plan differs, the plan wins — follow it and update this section.

This app replaces Nova and Airtable. How the backend works, per the plan:

- **Contract-driven.** Every resource is defined in PHP. The frontend renders lists, detail and forms from `GET /resources/{resource}` (supports ETag) through generic endpoints; do not hand-build a screen per resource.
- **Page flow.** Login (email + password) → two-factor → `GET /me` (roles, permissions) → `GET /navigation` (sidebar, already permission-filtered) → resource contract → list endpoint.
- **Auth.** Bearer token on every request; no cookies, no CSRF. First login forces two-factor setup.
- **Languages.** Five interface languages (en, de, it, es, fr), chosen per admin. The backend translates labels and errors from `Accept-Language`; `error.details` stays English. Translated fields arrive with all five languages.
- **Editing.** Detail drawer, with row versions for stale-save protection. Page-number paging with capped totals on large tables.
- **Sensitive data** is masked by default; revealing needs a permission and is logged.
- **Money actions** (refund, payout) need a risk warning, a mandatory reason and a confirmation.

The source of truth for shapes is `cms/docs` (`conventions.md`, `field-types.md`) on backend branch `project/P-BIK-77/custom-cms`. If that branch is not checked out in `../bf-backend`, the docs are not available: do not invent endpoints, payloads or field types — ask.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components enabled), React 19, TypeScript (strict)
- Tailwind CSS v4, npm, `src/` directory, `@/*` import alias
- shadcn/ui (`base-nova` style, built on Base UI — not Radix), icons from `lucide-react`, toasts with `sonner`, theme via `next-themes`
- Class merging: `cn` from `@/lib/utils` (the `cn` package, not clsx + tailwind-merge)
- TanStack Query v5 for server state; client and defaults in `src/lib/query-client.ts`, mounted in `src/components/providers.tsx`
- TanStack Table **v9** for data tables. The API differs from v8 (`useTable`, `tableFeatures`, `table.FlexRender`); read `node_modules/@tanstack/react-table/skills/` before writing table code
- Axios client for the CMS API in `src/lib/api/client.ts` (bearer token + `Accept-Language`, base `NEXT_PUBLIC_CMS_API_URL/cms/v1`)

Environment variables are listed in `.env.example`.

More specific conventions live in `.claude/rules/` and load when matching files are touched.

## Structure

```
src/
  app/(cms)/            signed-in routes, wrapped in the app shell. Login will live outside this group.
  components/ui/        shadcn primitives (generated)
  components/layout/    app shell: header, sidebar, menu search, user menu
  components/data-table/ generic TanStack Table (presentation only, knows nothing about resources)
  features/<feature>/   types.ts, api/, queries/, mutations/, hooks/, lib/, components/
  lib/                  API client, query client, formatting
  mocks/                mock data, used only by features' api/ files
```

- `features/resources` is the generic, contract-driven screen: `ResourceView` renders the list, toolbar, paging and detail drawer for any resource from its contract. `(cms)/page.tsx` shows it for the mock `orders` resource.
- `features/navigation` and `features/session` feed the sidebar and the user menu.
- **Everything is mocked for now.** The shapes in each feature's `types.ts` are provisional placeholders, not the real contract. Each mocked function in `features/*/api/` is marked `MOCK`.
- List state (page, sort, search, tab, open record) lives in the URL: `features/resources/hooks/use-list-state.ts`.
- Theme: an ink frame (header + sidebar) around a paper content sheet; BikeFlip coral (`--brand`) is a signal colour only. Tokens are in `src/app/globals.css`.

## Commands

```sh
npm run dev      # dev server
npm run build    # production build (also type-checks)
npm run lint     # eslint
```

## Rules

- Read the official docs before implementing or making claims about a library. For Next.js, read `node_modules/next/dist/docs/` — this version differs from older ones.
- Check how the codebase already does something before adding a new pattern or abstraction.
- Keep changes minimal and scoped: no cleanup or refactors unless asked.
- Do not add a dependency without asking; the stack is chosen deliberately.
- **Required: the feature folder layout.** All domain code goes in `src/features/<feature>/` with `api/`, `queries/`, `mutations/`, `hooks/`, `lib/`, `components/` and `types.ts`. Read hooks (`useQuery`) go in `queries/` and write hooks (`useMutation`) in `mutations/`, never in the same folder or file; one hook per file; query keys only from `queries/keys.ts`; only `api/` talks to the backend. The full rules are in `.claude/rules/features.md` — read it before adding or moving anything under `src/features/`. Do not add a query or mutation anywhere else.
- Server Components by default; add `'use client'` only where interactivity needs it.
- Never commit `.env*` files or secrets.
- Commit or push only when asked. `main` deploys to Vercel.
- Run `npm run lint` and `npm run build` before calling a change done.

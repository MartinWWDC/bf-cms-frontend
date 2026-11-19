# CLAUDE.md

@AGENTS.md

## Project

`bf-cms-frontend` is the internal CMS / admin frontend for BikeFlip, a used bike marketplace (bikes, components, clothing). It is used by staff, not by the public. It deploys to Vercel from `main`.

The app talks to the real CMS API: login with two-factor, the navigation, the generic contract-driven resource screens and the fixed pages (roles, staff, audit, tasks, dashboards, assistant, warehouse scan). There is no mock data: without a reachable API (`NEXT_PUBLIC_CMS_API_URL`) only the login page renders. The API is not deployed on dev yet, so the screens were built from `cms/docs` and the backend code and still need a pass against real data.

## Related projects

Sibling checkouts, readable from this session (see `.claude/settings.json`). Treat them as reference only: never edit them from here.

| Project | Path | What it is |
| --- | --- | --- |
| `bf-backend` | `../bf-backend` | Laravel repo. The CMS API is its self-contained `cms/` module (namespace `Cms\`, routes under `/cms/v1`), run as its own service. The marketplace API (`/api/v1`) is not what this app talks to. |
| `bf-frontend` | `../bf-frontend` | Public marketplace site (Next.js Pages Router, SCSS modules, SWR). Useful for domain knowledge only; it is a different stack and uses cookie auth, so do not copy its conventions or API client. |

## CMS backend (Linear project P-BIK-77)

**Living plan:** "Custom CMS Build Plan" — https://claude.ai/artifact/4EMeA9kA9VspRx6VyR1RGW

The plan is updated often and is the authority on backend status, decisions and frontend tasks. Read it with the Artifact tool (`action: "read"`, not a web fetch) before starting any work that touches auth, the API, the resource contract or screen behaviour. The summary below is a snapshot of Draft 5 (19 Nov 2026) and may be stale: if the plan differs, the plan wins — follow it and update this section.

This app replaces Nova and Airtable. How the backend works, per the plan:

- **Contract-driven.** Every resource is defined in PHP. The frontend renders lists, detail and forms from `GET /resources/{resource}` (supports ETag) through generic endpoints; do not hand-build a screen per resource.
- **Page flow.** Login (email + password) → two-factor → `GET /me` (roles, permissions) → `GET /navigation` (sidebar, already permission-filtered) → resource contract → list endpoint.
- **Auth.** Bearer token on every request; no cookies, no CSRF. First login forces two-factor setup.
- **Languages.** Five interface languages (en, de, it, es, fr), chosen per admin. The backend translates labels and errors from `Accept-Language`; `error.details` stays English. Translated fields arrive with all five languages.
- **Editing.** Detail drawer, with row versions for stale-save protection. Page-number paging with capped totals on large tables.
- **Sensitive data** is masked by default; revealing needs a permission and is logged.
- **Money actions** (refund, payout) need a risk warning, a mandatory reason and a confirmation.
- **Actions** carry an `Idempotency-Key`; a preview returns risk flags (warnings must be acknowledged, blocking ones stop the action); actions on many records and exports are queued jobs.
- **Fixed pages** come from the navigation as `page` nodes: `roles`, `staff`, `audit`, `tasks`, `dashboards/{key}`. Everything else is a resource `view`.

The source of truth for shapes is `cms/docs` (`conventions.md`, `field-types.md`, `openapi.json`, `changelog.md`, plus one workflow page per custom screen) on backend branch `project/P-BIK-77/custom-cms`. Types in `src/lib/api/types.ts` and each feature's `types.ts` are written by hand from `openapi.json`; when the changelog lists a change, update them. If that branch is not checked out in `../bf-backend`, the docs are not available: do not invent endpoints, payloads or field types — ask.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components enabled), React 19, TypeScript (strict)
- Tailwind CSS v4, npm, `src/` directory, `@/*` import alias
- shadcn/ui (`base-nova` style, built on Base UI — not Radix), icons from `lucide-react`, toasts with `sonner`, theme via `next-themes`
- Class merging: `cn` from `@/lib/utils` (the `cn` package, not clsx + tailwind-merge)
- TanStack Query v5 for server state; client and defaults in `src/lib/query-client.ts`, mounted in `src/components/providers.tsx`
- TanStack Table **v9** for data tables. The API differs from v8 (`useTable`, `tableFeatures`, `table.FlexRender`); read `node_modules/@tanstack/react-table/skills/` before writing table code
- Axios client for the CMS API in `src/lib/api/client.ts` (bearer token + `Accept-Language` + `X-Timezone`, base `NEXT_PUBLIC_CMS_API_URL/cms/v1`). Every failed request is an `ApiError` (`code`, `message`, `fields`, `details`, `requestId`); show it with `useErrorMessage()` / `useErrorToast()` / `<ErrorState>`. The token lives in `src/lib/api/auth-token.ts`
- next-intl for translations, used client-side without locale routing: messages in `messages/{en,de,it,es,fr}.json`, provider and helpers in `src/i18n/`

Environment variables are listed in `.env.example`.

More specific conventions live in `.claude/rules/` and load when matching files are touched.

## Structure

```
src/
  app/login/            sign-in (password, two-factor, first-time setup)
  app/(cms)/            signed-in routes, wrapped in the auth gate and the app shell
  app/(cms)/r/[resource]/[[...view]]/  the generic screen of any resource
  components/ui/        shadcn primitives (generated)
  components/layout/    app shell: header, sidebar, menu search, user menu, page header, no-access page
  components/data-table/ generic TanStack Table (presentation only, knows nothing about resources)
  features/<feature>/   types.ts, api/, queries/, mutations/, hooks/, lib/, components/
  i18n/                 language config, provider, locale store, useFormat
  lib/                  API client, query client, small helpers
messages/               one JSON file per language; en.json is the source of truth
```

- `features/resources` is the generic, contract-driven screen: `ResourceView` renders the list (tabs, search, filter builder, grouping, totals, columns, saved views, selection), and `RecordDrawer` one record (sections, related lists, notes, history, edit form, actions) for any resource from its contract. `FieldValue` and `FieldInput` are the only places that know the field types; `ActionDialog` runs every action.
- A resource with `detail.custom_endpoint` can get a custom-built screen: a component per resource key, registered in `app/(cms)/r/[resource]/[[...view]]/resource-screen.tsx` and shown as the drawer's first tab.
- `features/navigation` is the menu and the route guard (`RouteGuard`): a route that is not in `GET /navigation` renders the no-access page. `features/session` is login, `/me`, sessions and permissions.
- Links inside the app are built in `src/lib/routes.ts` (`resourceHref`, `recordHref`, `pageHref`), never by hand.
- List state (tab, page, sort, search, filter, grouping, totals, saved view, columns, open record) lives in the URL: `features/resources/hooks/use-list-state.ts`.
- Background jobs started in the tab are followed in the job tray (`features/jobs`, `trackJob`).
- Theme: an ink frame (header + sidebar) around a paper content sheet; BikeFlip coral (`--brand`) is a signal colour only. Tokens are in `src/app/globals.css`.

## Commands

```sh
npm run dev      # dev server
npm run build    # production build (also type-checks)
npm run lint     # eslint + translation key check
npm run i18n:check  # only the translation key check
```

## Rules

- Read the official docs before implementing or making claims about a library. For Next.js, read `node_modules/next/dist/docs/` — this version differs from older ones.
- Check how the codebase already does something before adding a new pattern or abstraction.
- Keep changes minimal and scoped: no cleanup or refactors unless asked.
- Do not add a dependency without asking; the stack is chosen deliberately.
- **Required: the feature folder layout.** All domain code goes in `src/features/<feature>/` with `api/`, `queries/`, `mutations/`, `hooks/`, `lib/`, `components/` and `types.ts`. Read hooks (`useQuery`) go in `queries/` and write hooks (`useMutation`) in `mutations/`, never in the same folder or file; one hook per file; query keys only from `queries/keys.ts`; only `api/` talks to the backend. The full rules are in `.claude/rules/features.md` — read it before adding or moving anything under `src/features/`. Do not add a query or mutation anywhere else.
- **Required: no hard-coded UI text.** Every visible or announced string comes from `useTranslations()`, with the key added to all five files in `messages/` in the same change; numbers, money and dates are formatted with `useFormat()`. Text that comes from the API (labels, errors) is translated by the backend and does not go in `messages/`. The full rules are in `.claude/rules/i18n.md`.
- Server Components by default; add `'use client'` only where interactivity needs it.
- Never commit `.env*` files or secrets.
- Commit or push only when asked. `main` deploys to Vercel.
- Run `npm run lint` and `npm run build` before calling a change done.

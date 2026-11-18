---
paths:
  - "src/lib/**"
  - "src/hooks/**"
  - "src/features/**"
  - "src/app/**"
---

# Data and tables

- Server state goes through TanStack Query. Do not keep fetched data in `useState`/context, and do not add SWR.
- All backend calls use the `api` Axios instance from `@/lib/api/client`, and only from a feature's `api/` folder. Components call hooks, never `api` or `fetch` directly. Folder layout: see `features.md`.
- Request and response types must match the CMS docs in `../bf-backend/cms/docs` (`conventions.md`, `field-types.md`). If the docs or an endpoint are not available, stop and ask instead of guessing a shape.
- Screens are rendered from the resource contract (`GET /resources/{resource}`): columns, filters and form fields come from the contract, not from per-resource hard-coded definitions.
- Tables use TanStack Table with shadcn table components. Sorting, filtering and pagination are server-side for any list that can grow; mirror that state in the URL so views are shareable.
- TanStack Table is v9: use `useTable` with `tableFeatures`, keep `features`, `columns` and empty-data fallbacks at module scope, and read `node_modules/@tanstack/react-table/skills/` first. Do not write v8 code (`useReactTable`, `getCoreRowModel`).

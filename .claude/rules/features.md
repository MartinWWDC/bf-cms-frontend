---
paths:
  - "src/features/**"
  - "src/mocks/**"
---

# Feature folders

Every domain lives in `src/features/<feature>/` and uses the same layout. Create a folder only when it has something in it.

```
src/features/<feature>/
  types.ts        shapes shared by the whole feature
  api/            <feature>.api.ts — plain async functions, one per endpoint. No React, no hooks.
  queries/        keys.ts (query key factory), one use-*.ts per read hook, index.ts
  mutations/      one use-*.ts per write hook, index.ts
  hooks/          other hooks (URL state, UI state)
  lib/            pure helpers
  components/     UI of the feature
```

- Reads and writes stay apart: a `useQuery` hook goes in `queries/`, a `useMutation` hook in `mutations/`. One hook per file, named after the hook.
- Only `api/` talks to the backend (through `api` from `@/lib/api/client`). Hooks call `api/` functions; components call hooks.
- Query keys come only from the feature's `queries/keys.ts`. A mutation invalidates by key prefix from that factory; never write a key array inline.
- Import hooks through the folder index (`../queries`, `../mutations`), not the individual files, from outside the folder.
- A feature may import another feature's `types.ts` and hooks, never its `api/` or `components/` internals. Code used by several features moves to `src/components/` or `src/lib/`.
- Mock data lives only in `src/mocks/` and is used only from `api/` files. Each mocked function is marked `MOCK`; replacing it with the real call must not require changes anywhere else.

/**
 * The signed-in admin, as returned by `GET /me`.
 *
 * PROVISIONAL: the build plan says `/me` returns the admin with roles and permissions
 * but gives no response shape. Align with `cms/docs/conventions.md` once available.
 */
export interface Admin {
  id: string;
  name: string;
  email: string;
  /** Interface language chosen by the admin: en, de, it, es or fr. */
  locale: string;
  roles: string[];
  permissions: string[];
  avatarUrl?: string;
}

/**
 * Login, the signed-in admin and their sessions.
 * Shapes from `cms/docs/openapi.json` (`Me`, `LoginChallenge`, `IssuedSession`, `Session`)
 * and `conventions.md` section 2.
 */

/** The signed-in admin, `GET /me`. */
export interface Me {
  id: number;
  name: string;
  email: string;
  /** Interface language in use: en, de, it, es or fr. */
  locale: string;
  /** Role names. Roles are made by admins; only the super admin role is built in. */
  roles: string[];
  is_super_admin: boolean;
  /** Worked-out permission keys. `resource.*` covers a resource, `*` everything. */
  permissions: string[];
  two_factor_enabled: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Answer of the password step. No token is issued yet. */
export interface LoginChallenge {
  /** `two_factor`, or `two_factor_setup` on the first login. */
  challenge: string;
  challenge_token: string;
  /** Seconds the challenge stays valid. */
  expires_in: number;
  /** Only for `two_factor_setup`. */
  setup?: {
    secret: string;
    otpauth_uri: string;
  };
}

export interface TwoFactorInput {
  challenge_token: string;
  /** Six digits from the authenticator app, or a recovery code (`abcde-12345`). */
  code: string;
}

export interface IssuedSession {
  token: string;
  expires_at: string;
  /** Only after the setup step; shown this once. */
  recovery_codes?: string[];
}

export interface Session {
  id: number;
  ip: string | null;
  user_agent: string | null;
  current: boolean;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string;
}

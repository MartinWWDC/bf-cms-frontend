import { api, type Envelope, getData } from "@/lib/api/client";

import type { IssuedSession, LoginChallenge, LoginInput, Me, Session, TwoFactorInput } from "../types";

/** Step 1: email and password. Answers with a challenge, never with a token. */
export async function login(input: LoginInput): Promise<LoginChallenge> {
  const response = await api.post<Envelope<LoginChallenge>>("/auth/login", input);
  return response.data.data;
}

/** Step 2: the two-factor or recovery code. */
export async function verifyTwoFactor(input: TwoFactorInput): Promise<IssuedSession> {
  const response = await api.post<Envelope<IssuedSession>>("/auth/two-factor", input);
  return response.data.data;
}

/** Step 2 on the first login: confirm the authenticator setup with its first code. */
export async function confirmTwoFactorSetup(input: TwoFactorInput): Promise<IssuedSession> {
  const response = await api.post<Envelope<IssuedSession>>("/auth/two-factor/setup", input);
  return response.data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export function fetchMe(): Promise<Me> {
  return getData<Me>("/me");
}

/** Saves the admin's language. Answers with `/me` already in the new language. */
export async function updateMyLocale(locale: string): Promise<Me> {
  const response = await api.patch<Envelope<Me>>("/me", { locale });
  return response.data.data;
}

export function fetchSessions(): Promise<Session[]> {
  return getData<Session[]>("/auth/sessions");
}

export async function revokeSession(id: number): Promise<void> {
  await api.delete(`/auth/sessions/${id}`);
}

/** Replaces the 8 recovery codes. Needs a current two-factor code. */
export async function regenerateRecoveryCodes(code: string): Promise<string[]> {
  const response = await api.post<Envelope<{ recovery_codes: string[] }>>("/auth/recovery-codes", { code });
  return response.data.data.recovery_codes;
}

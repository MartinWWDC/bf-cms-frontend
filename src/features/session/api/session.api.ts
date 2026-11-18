import { mockDelay } from "@/mocks/delay";
import { mockAdmin } from "@/mocks/session";

import type { Admin } from "../types";

/** MOCK. Replace the body with `api.get("/me")` once login exists. */
export function fetchMe(): Promise<Admin> {
  return mockDelay(mockAdmin, 200);
}

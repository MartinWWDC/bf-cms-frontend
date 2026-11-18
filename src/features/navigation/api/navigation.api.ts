import { mockDelay } from "@/mocks/delay";
import { mockNavigation } from "@/mocks/navigation";

import type { NavGroup } from "../types";

/** MOCK. Replace the body with `api.get("/navigation")` once the endpoint is reachable. */
export function fetchNavigation(): Promise<NavGroup[]> {
  return mockDelay(mockNavigation, 250);
}

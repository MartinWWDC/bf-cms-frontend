import { useMutation } from "@tanstack/react-query";

import { regenerateRecoveryCodes } from "../api/session.api";

export function useRegenerateRecoveryCodes() {
  return useMutation({ mutationFn: regenerateRecoveryCodes });
}

import { useQuery } from "@tanstack/react-query";

import { fetchLiveSettings } from "../api/live.api";
import { liveKeys } from "./keys";

export function useLiveSettings() {
  return useQuery({
    queryKey: liveKeys.settings(),
    queryFn: fetchLiveSettings,
    staleTime: Infinity,
    retry: false,
  });
}

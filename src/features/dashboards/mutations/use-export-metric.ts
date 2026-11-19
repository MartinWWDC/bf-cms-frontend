import { useMutation } from "@tanstack/react-query";

import { exportMetric } from "../api/dashboards.api";
import type { MetricParams } from "../types";

/** Downloads the data behind a metric as CSV. The download is written to the audit trail. */
export function useExportMetric() {
  return useMutation({
    mutationFn: ({ metric, params }: { metric: string; params: MetricParams }) => exportMetric(metric, params),
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}

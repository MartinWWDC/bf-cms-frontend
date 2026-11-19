import type { Metadata } from "next";

import { RolesScreen } from "@/features/access/components/roles-screen";
import { RouteGuard } from "@/features/navigation/components/route-guard";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <RouteGuard page="roles">
      <RolesScreen />
    </RouteGuard>
  );
}

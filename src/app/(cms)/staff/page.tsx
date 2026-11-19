import type { Metadata } from "next";

import { StaffScreen } from "@/features/access/components/staff-screen";
import { RouteGuard } from "@/features/navigation/components/route-guard";

export const metadata: Metadata = { title: "Staff accounts" };

export default function StaffPage() {
  return (
    <RouteGuard page="staff">
      <StaffScreen />
    </RouteGuard>
  );
}

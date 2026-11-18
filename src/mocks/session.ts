import type { Admin } from "@/features/session/types";

export const mockAdmin: Admin = {
  id: "adm_001",
  name: "Demo Admin",
  email: "demo.admin@bikeflip.example",
  locale: "en",
  roles: ["Operations lead"],
  permissions: ["orders.view", "orders.refund", "orders.cancel"],
};

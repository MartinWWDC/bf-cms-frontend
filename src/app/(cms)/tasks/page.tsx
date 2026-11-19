import { Suspense } from "react";
import type { Metadata } from "next";

import { RouteGuard } from "@/features/navigation/components/route-guard";
import { TasksScreen } from "@/features/tasks/components/tasks-screen";

export const metadata: Metadata = { title: "My tasks" };

export default function TasksPage() {
  return (
    <RouteGuard page="tasks">
      {/* The scope and filters of the task list live in the URL. */}
      <Suspense fallback={null}>
        <TasksScreen />
      </Suspense>
    </RouteGuard>
  );
}

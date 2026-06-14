import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { AiPanel } from "@/components/ai-assistant/AiPanel";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }
    return { session, role: null as string | null };
  },
});

function AuthLayout() {
  return (
    <>
      <Outlet />
      <AiPanel />
    </>
  );
}

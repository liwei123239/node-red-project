import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  const users = useQuery({
    ...trpc.users.list.queryOptions(),
    retry: false,
  });

  const isForbidden =
    users.isError &&
    (users.error as { data?: { code?: string } })?.data?.code === "FORBIDDEN";

  useEffect(() => {
    if (isForbidden) {
      navigate({ to: "/dashboard" });
    }
  }, [isForbidden, navigate]);

  if (users.isPending || isForbidden) return null;

  return <Outlet />;
}

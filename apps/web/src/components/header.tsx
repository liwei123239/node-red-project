import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const BASE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/todos", label: "Todos" },
] as const;

export default function Header() {
  const usersQuery = useQuery({
    ...trpc.users.list.queryOptions(),
    retry: false,
  });
  const isAdmin = usersQuery.isSuccess;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {BASE_LINKS.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin/users">用户管理</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}

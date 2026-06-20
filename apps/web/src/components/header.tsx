import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { trpc } from "@/utils/trpc";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const BASE_LINKS = [
	{ to: "/", label: "Home" },
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/todos", label: "Todos" },
	{ to: "/measurements", label: "测量记录" },
] as const;

export default function Header() {
	const usersQuery = useQuery({
		...trpc.users.list.queryOptions(),
		retry: false,
	});
	const isAdmin = usersQuery.isSuccess;

	return (
		<div>
			<div className="flex flex-row flex-wrap items-center justify-between gap-2 px-2 py-1">
				<nav className="flex flex-wrap gap-4 text-lg">
					{BASE_LINKS.map(({ to, label }) => (
						<Link key={to} to={to}>
							{label}
						</Link>
					))}
					{isAdmin && <Link to="/admin/users">用户管理</Link>}
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

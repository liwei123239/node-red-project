import { Button } from "@node-red-project/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@node-red-project/ui/components/card";
import { Skeleton } from "@node-red-project/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/admin/users")({
	component: UsersPage,
});

type Role = "admin" | "student" | "researcher";

const ROLES: Role[] = ["admin", "student", "researcher"];

function UserTableBody({
	updateRole,
	deactivate,
	users,
}: {
	users: { id: string; name: string; email: string; role: string | null }[];
	updateRole: {
		isPending: boolean;
		variables?: { userId: string };
		mutate: (input: { userId: string; role: Role }) => void;
	};
	deactivate: {
		isPending: boolean;
		variables?: { userId: string };
		mutate: (input: { userId: string }) => void;
	};
}) {
	return (
		<table className="w-full text-xs">
			<thead>
				<tr className="border-border border-b text-left text-muted-foreground">
					<th className="pr-4 pb-2 font-medium">Name</th>
					<th className="pr-4 pb-2 font-medium">Email</th>
					<th className="pr-4 pb-2 font-medium">Role</th>
					<th className="pb-2 font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{users.map((u) => {
					const isUpdating =
						updateRole.isPending && updateRole.variables?.userId === u.id;
					const isDeactivating =
						deactivate.isPending && deactivate.variables?.userId === u.id;

					return (
						<tr className="border-border/50 border-b last:border-0" key={u.id}>
							<td className="py-2.5 pr-4 font-medium">{u.name}</td>
							<td className="py-2.5 pr-4 text-muted-foreground">{u.email}</td>
							<td className="py-2.5 pr-4">
								<select
									className="h-7 rounded-none border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isUpdating}
									onChange={(e) => {
										const role = e.target.value as Role;
										updateRole.mutate({ userId: u.id, role });
									}}
									value={u.role ?? ""}
								>
									<option disabled value="">
										— select —
									</option>
									{ROLES.map((r) => (
										<option key={r} value={r}>
											{r}
										</option>
									))}
								</select>
							</td>
							<td className="py-2.5">
								<Button
									disabled={isDeactivating}
									onClick={() => deactivate.mutate({ userId: u.id })}
									size="xs"
									variant="destructive"
								>
									{isDeactivating ? "Deactivating…" : "Deactivate"}
								</Button>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

function UsersContent() {
	const queryClient = useQueryClient();

	const users = useQuery(trpc.users.list.queryOptions());

	const updateRole = useMutation({
		mutationFn: (input: { userId: string; role: Role }) =>
			trpcClient.users.updateRole.mutate(input),
		onSuccess: () => {
			queryClient.invalidateQueries(trpc.users.list.queryOptions());
		},
	});

	const deactivate = useMutation({
		mutationFn: (input: { userId: string }) =>
			trpcClient.users.deactivate.mutate(input),
		onSuccess: () => {
			queryClient.invalidateQueries(trpc.users.list.queryOptions());
		},
	});

	if (users.isPending) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
					<Skeleton className="h-10 w-full" key={i} />
				))}
			</div>
		);
	}

	if (users.isError) {
		return <p className="text-destructive text-sm">Failed to load users.</p>;
	}

	return (
		<UserTableBody
			deactivate={deactivate}
			updateRole={updateRole}
			users={users.data}
		/>
	);
}

function UsersPage() {
	return (
		<div className="mx-auto max-w-5xl p-6">
			<Card>
				<CardHeader>
					<CardTitle>User Management</CardTitle>
				</CardHeader>
				<CardContent>
					<UsersContent />
				</CardContent>
			</Card>
		</div>
	);
}

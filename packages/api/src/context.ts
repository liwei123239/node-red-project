import { auth } from "@node-red-project/auth";
import { db } from "@node-red-project/db";
import { member } from "@node-red-project/db/schema/org";
import { and, eq } from "drizzle-orm";
import type { Context as HonoContext } from "hono";

const DEFAULT_ORG_ID = "default-org";

export type CreateContextOptions = {
  context: HonoContext;
};

async function getMemberRole(userId: string): Promise<string | null> {
  const [result] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, DEFAULT_ORG_ID)))
    .limit(1);
  return result?.role ?? null;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const role = session ? await getMemberRole(session.user.id) : null;

  return {
    auth: null,
    session,
    role,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

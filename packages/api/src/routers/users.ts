import { db } from "@node-red-project/db";
import { user } from "@node-red-project/db/schema/auth";
import { member } from "@node-red-project/db/schema/org";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, router } from "../index";

const DEFAULT_ORG_ID = "default-org";

const roleSchema = z.enum(["admin", "student", "researcher"]);

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: member.role,
      })
      .from(user)
      .leftJoin(
        member,
        and(eq(member.userId, user.id), eq(member.organizationId, DEFAULT_ORG_ID)),
      )
      .orderBy(user.createdAt);
    return rows;
  }),

  updateRole: adminProcedure
    .input(z.object({ userId: z.string(), role: roleSchema }))
    .mutation(async ({ input }) => {
      await db
        .insert(member)
        .values({
          id: crypto.randomUUID(),
          organizationId: DEFAULT_ORG_ID,
          userId: input.userId,
          role: input.role,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [member.userId, member.organizationId],
          set: { role: input.role },
        });
      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate your own account",
        });
      }
      await db
        .delete(member)
        .where(
          and(
            eq(member.userId, input.userId),
            eq(member.organizationId, DEFAULT_ORG_ID),
          ),
        );
      return { success: true };
    }),
});

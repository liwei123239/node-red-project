import "dotenv/config";
import { db } from "@node-red-project/db";
import { member, organization } from "@node-red-project/db/schema/org";
import { user } from "@node-red-project/db/schema/auth";
import { auth } from "@node-red-project/auth";
import { eq } from "drizzle-orm";

const DEFAULT_ORG_ID = "default-org";
const DEFAULT_ORG_NAME = "Node-RED Platform";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin123456!";
const ADMIN_NAME = "Administrator";

async function seed() {
  // 1. Upsert default organization
  const [existingOrg] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, DEFAULT_ORG_ID))
    .limit(1);

  if (!existingOrg) {
    await db.insert(organization).values({
      id: DEFAULT_ORG_ID,
      name: DEFAULT_ORG_NAME,
      slug: "default",
      createdAt: new Date(),
    });
    console.log("✓ Created default organization");
  } else {
    console.log("· Default organization already exists");
  }

  // 2. Upsert admin user via Better-Auth
  let adminUserId: string;
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingUser) {
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
      },
    });
    adminUserId = result.user.id;
    console.log("✓ Created admin user:", ADMIN_EMAIL);
  } else {
    adminUserId = existingUser.id;
    console.log("· Admin user already exists:", ADMIN_EMAIL);
  }

  // 3. Upsert admin membership
  const [existingMember] = await db
    .select()
    .from(member)
    .where(eq(member.userId, adminUserId))
    .limit(1);

  if (!existingMember) {
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: DEFAULT_ORG_ID,
      userId: adminUserId,
      role: "admin",
      createdAt: new Date(),
    });
    console.log("✓ Added admin to default organization with role: admin");
  } else if (existingMember.role !== "admin") {
    await db
      .update(member)
      .set({ role: "admin" })
      .where(eq(member.userId, adminUserId));
    console.log("✓ Updated admin role to: admin");
  } else {
    console.log("· Admin membership already correct");
  }

  console.log("\n✅ Seed complete");
  console.log(`   Admin email: ${ADMIN_EMAIL}`);
  console.log(`   Admin password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

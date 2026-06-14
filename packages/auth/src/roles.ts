export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  RESEARCHER: "researcher",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

import type { UserRole } from "@prisma/client";
import { type Session } from "next-auth";

export function isAdmin(role: UserRole | null | undefined): role is "ADMIN" {
  return role === "ADMIN";
}

export function requireSignedIn(session: Session | null) {
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user.id;
}

export function requireAdmin(session: Session | null) {
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isAdmin(session.user.role)) {
    throw new Error("FORBIDDEN");
  }

  return session.user.id;
}

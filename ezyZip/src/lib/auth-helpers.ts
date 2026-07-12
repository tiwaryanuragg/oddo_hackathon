import { auth } from "@/auth";
import { NextResponse } from "next/server";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "Employee" | "DepartmentHead" | "AssetManager" | "Admin";
  department?: string;
}

/**
 * Get authenticated session with typed user.
 * Returns null if not authenticated.
 */
export async function getSessionWithRole(): Promise<UserSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as any;
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "Employee",
    department: user.department,
  };
}

/**
 * Require authentication. Returns 401 if not logged in.
 */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Return 403 forbidden response.
 */
export function forbidden(message = "You do not have permission to perform this action") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Check if user has one of the allowed roles.
 */
export function hasRole(user: UserSession, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

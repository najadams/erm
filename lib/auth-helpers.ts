import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES, hasPermission, Permission, mapLegacyRole } from "@/lib/permissions";
import { NextResponse } from "next/server";

export type AuthResult = {
  authorized: boolean;
  session: any;
  userId: string;
  userRole: string;
  error?: NextResponse;
};

/**
 * Standard authentication check for API routes.
 * Returns session info or an error response.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      session: null,
      userId: '',
      userRole: '',
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  const rawRole = (session.user as any).role || 'USER';
  const normalizedRole = mapLegacyRole(rawRole);

  return {
    authorized: true,
    session,
    userId: (session.user as any).id,
    userRole: normalizedRole,
  };
}

/**
 * Check if user has specific permission.
 */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth;

  if (!hasPermission(auth.userRole, permission)) {
    return {
      ...auth,
      authorized: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    };
  }

  return auth;
}

/**
 * Check if user has one of the specified roles.
 */
export async function requireRole(...roles: (keyof typeof ROLES)[]): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth;

  const validRoles: string[] = roles.map(r => ROLES[r]);
  if (!validRoles.includes(auth.userRole)) {
    return {
      ...auth,
      authorized: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    };
  }

  return auth;
}

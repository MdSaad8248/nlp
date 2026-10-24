import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const AUTH_COOKIE_NAME = "academic_auth_session";
const SESSION_SECRET = process.env.AUTH_SECRET || "academic-ai-platform-defense-secret-2026";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  email: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  rollNumber: string | null;
  department: string | null;
  program: string | null;
  semester: number;
  enrolledCourseCodes: string[];
  managedCourseCodes: string[];
}

/**
 * Creates a signed tamper-proof session token: `base64(payload).signature`
 */
export function createSessionToken(payload: Omit<SessionPayload, "issuedAt" | "expiresAt">): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");

  if (signature !== expectedSig) {
    return null; // Tampered token
  }

  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(raw) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.expiresAt || payload.expiresAt < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from DB via cookies.
 * Works both with NextRequest and standard server-component context via next/headers.
 */
export async function getAuthenticatedUser(req?: NextRequest | Request): Promise<AuthenticatedUser | null> {
  let token: string | undefined;

  if (req && "cookies" in req) {
    const reqCookies = (req as NextRequest).cookies;
    token = reqCookies.get(AUTH_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // headers/cookies context not available (e.g. background script)
    }
  }

  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      courses: { include: { course: true } },
      managedCourses: { include: { course: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role as "STUDENT" | "TEACHER" | "ADMIN") || "STUDENT",
    rollNumber: user.rollNumber,
    department: user.department,
    program: user.program,
    semester: user.semester,
    enrolledCourseCodes: user.courses.map((c) => c.course.code),
    managedCourseCodes: user.managedCourses.map((mc) => mc.course.code),
  };
}

/**
 * Enforces role-based authorization for an API route.
 * Returns either { user } or { errorResponse }
 */
export async function requireAuth(
  req: NextRequest | Request,
  allowedRoles?: ("STUDENT" | "TEACHER" | "ADMIN")[]
): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Authentication required. Please sign in to access this resource." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Access denied. Resource requires role [${allowedRoles.join(", ")}], but authenticated as ${user.role}.`,
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Sets the secure HTTP-only session cookie on a NextResponse.
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the auth cookie on a NextResponse.
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

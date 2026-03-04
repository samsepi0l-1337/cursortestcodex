import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const updateRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const dynamic = "force-dynamic";

function toAuthResponse(error: unknown) {
  if ((error as Error).message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();

  try {
    requireAdmin(session);
  } catch (error) {
    return toAuthResponse(error);
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid role payload" },
      { status: 400 },
    );
  }

  const { id } = await params;

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/74b7bc1e-f939-4f27-8b41-5c9f42196d92", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "40b523",
    },
    body: JSON.stringify({
      sessionId: "40b523",
      runId: "review-1",
      hypothesisId: "H1",
      location: "app/(admin)/admin/users/[id]/role/route.ts:49",
      message: "admin_role_update_attempt",
      data: {
        targetIdLength: id.length,
        requestedRole: parsed.data.role,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  let updatedUser;
  try {
    updatedUser = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/74b7bc1e-f939-4f27-8b41-5c9f42196d92", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "40b523",
      },
      body: JSON.stringify({
        sessionId: "40b523",
        runId: "review-1",
        hypothesisId: "H1",
        location: "app/(admin)/admin/users/[id]/role/route.ts:66",
        message: "admin_role_update_error",
        data: {
          errorMessage: (error as Error).message,
          errorName: (error as Error).name,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }

  return NextResponse.json({ user: updatedUser });
}

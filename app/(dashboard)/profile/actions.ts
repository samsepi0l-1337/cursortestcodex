"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { requireSignedIn } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { uploadProfileImage } from "@/lib/s3";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).optional(),
});

function normalizeBio(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.length > 0 ? value : null;
}

function parseAvatarFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  if (!value.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  const maxSizeInBytes = 2 * 1024 * 1024;
  if (value.size > maxSizeInBytes) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  return value;
}

export async function upsertProfileAction(formData: FormData) {
  const session = await auth();
  const userId = requireSignedIn(session);

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    throw new Error("INVALID_PROFILE_INPUT");
  }

  const avatarFile = parseAvatarFile(formData.get("avatar"));
  let imageUrl: string | undefined;

  if (avatarFile) {
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    imageUrl = await uploadProfileImage({
      userId,
      file: buffer,
      contentType: avatarFile.type,
    });
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { imageUrl: true },
  });

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: parsed.data.displayName,
      bio: normalizeBio(parsed.data.bio),
      imageUrl,
    },
    update: {
      displayName: parsed.data.displayName,
      bio: normalizeBio(parsed.data.bio),
      imageUrl: imageUrl ?? existingProfile?.imageUrl ?? null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.displayName,
      image: imageUrl ?? existingProfile?.imageUrl ?? undefined,
    },
  });

  revalidatePath("/profile");
}

export async function deleteProfileAction() {
  const session = await auth();
  const userId = requireSignedIn(session);

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
      hypothesisId: "H2",
      location: "app/(dashboard)/profile/actions.ts:99",
      message: "delete_profile_start",
      data: {
        hasUserId: Boolean(userId),
        sessionRole: session?.user?.role ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  await prisma.profile.deleteMany({
    where: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: null,
      image: null,
      role: "USER",
    },
  });

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
      hypothesisId: "H2",
      location: "app/(dashboard)/profile/actions.ts:114",
      message: "delete_profile_role_reset_applied",
      data: {
        roleSetTo: "USER",
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  revalidatePath("/profile");
}

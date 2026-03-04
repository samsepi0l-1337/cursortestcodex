import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

import { deleteProfileAction, upsertProfileAction } from "./actions";

export const dynamic = "force-dynamic";

async function logoutAction() {
  "use server";

  await signOut({ redirectTo: "/login" });
}

type ProfilePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  const params = await searchParams;
  const profile = user?.profile;

  return (
    <section className="stack">
      <div className="card stack">
        <h1>My Profile</h1>
        <p className="muted">Role: {session.user.role}</p>
        {params.error === "forbidden" ?
          <p className="muted">
            You do not have permission to access that route.
          </p>
        : null}

        {profile?.imageUrl ?
          <Image
            alt="Profile avatar"
            height={96}
            src={profile.imageUrl}
            width={96}
          />
        : <p className="muted">No profile image uploaded yet.</p>}

        <form
          action={upsertProfileAction}
          className="stack"
          encType="multipart/form-data"
        >
          <label className="field">
            <span>Display Name</span>
            <input
              defaultValue={profile?.displayName ?? user?.name ?? ""}
              maxLength={80}
              minLength={2}
              name="displayName"
              required
              type="text"
            />
          </label>

          <label className="field">
            <span>Bio</span>
            <textarea
              defaultValue={profile?.bio ?? ""}
              maxLength={500}
              name="bio"
              rows={5}
            />
          </label>

          <label className="field">
            <span>Avatar Image (max 2MB)</span>
            <input
              accept="image/*"
              name="avatar"
              type="file"
            />
          </label>

          <div className="row">
            <button
              className="button"
              type="submit"
            >
              Save profile
            </button>
          </div>
        </form>

        <form action={deleteProfileAction}>
          <button
            className="button danger"
            type="submit"
          >
            Delete profile
          </button>
        </form>
      </div>

      <div className="card row">
        {session.user.role === "ADMIN" ?
          <Link href="/admin">Go to admin dashboard</Link>
        : null}
        <form action={logoutAction}>
          <button
            className="button secondary"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}

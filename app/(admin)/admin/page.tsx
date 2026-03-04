import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isAdmin(session.user.role)) {
    redirect("/profile?error=forbidden");
  }

  const [userCount, adminCount, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <section className="card stack">
      <h1>Admin Dashboard</h1>
      <div className="row">
        <p>Total users: {userCount}</p>
        <p>Admins: {adminCount}</p>
      </div>

      <h2>Latest Users</h2>
      <ul className="stack">
        {recentUsers.map((user) => (
          <li key={user.id}>
            <strong>{user.name ?? "Unnamed User"}</strong> (
            {user.email ?? "no-email"}) - {user.role}
          </li>
        ))}
      </ul>

      <p className="muted">
        API: <code>GET /admin/users</code> and{" "}
        <code>PATCH /admin/users/[id]/role</code>
      </p>
      <Link href="/profile">Back to profile</Link>
    </section>
  );
}

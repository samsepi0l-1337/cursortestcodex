import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  try {
    requireAdmin(session);
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
        hypothesisId: "H3",
        location: "app/(admin)/admin/layout.tsx:13",
        message: "admin_layout_guard_failure",
        data: {
          hasSessionUser: Boolean(session?.user?.id),
          role: session?.user?.role ?? null,
          errorMessage: (error as Error).message,
        },
        timestamp: 0,
      }),
    }).catch(() => {});
    // #endregion

    if ((error as Error).message === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/profile?error=forbidden");
  }

  return <section className="stack">{children}</section>;
}

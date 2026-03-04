import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function loginWithCredentials(formData: FormData) {
  "use server";

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid_input");
  }

  const result = await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
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
      hypothesisId: "H4",
      location: "app/(auth)/login/page.tsx:23",
      message: "credentials_sign_in_result",
      data: {
        hasResult: Boolean(result),
        error: result?.error ?? null,
        ok: result?.ok ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (result?.error) {
    redirect("/login?error=invalid_credentials");
  }

  redirect("/profile");
}

async function loginWithGitHub() {
  "use server";

  await signIn("github", { redirectTo: "/profile" });
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const hasGitHubProvider = Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
  );

  return (
    <section className="card stack">
      <h1>Sign In</h1>
      <p className="muted">
        Use your credentials to access profile and dashboard routes.
      </p>
      {error ?
        <p className="muted">Login failed. Please check your credentials.</p>
      : null}

      <form
        action={loginWithCredentials}
        className="stack"
      >
        <label className="field">
          <span>Email</span>
          <input
            required
            autoComplete="email"
            name="email"
            type="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            required
            autoComplete="current-password"
            minLength={8}
            name="password"
            type="password"
          />
        </label>
        <button
          className="button"
          type="submit"
        >
          Sign in with credentials
        </button>
      </form>

      {hasGitHubProvider ?
        <form action={loginWithGitHub}>
          <button
            className="button secondary"
            type="submit"
          >
            Sign in with GitHub
          </button>
        </form>
      : null}
    </section>
  );
}

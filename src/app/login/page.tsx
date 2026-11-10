"use client";

import { MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { setTokens, useAccessToken } from "@/lib/auth";

// Local-development helper: set NEXT_PUBLIC_DEMO_LOGIN=username:password in .env.local
// to pre-fill and show the login. Leave it unset in production.
const [DEMO_USER = "", DEMO_PASS = ""] = (process.env.NEXT_PUBLIC_DEMO_LOGIN ?? "").split(":");

export default function LoginPage() {
  const router = useRouter();
  const token = useAccessToken();
  const [username, setUsername] = useState(DEMO_USER);
  const [password, setPassword] = useState(DEMO_PASS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) router.replace("/");
  }, [token, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/token/", { username, password });
      setTokens(data.access, data.refresh);
      router.replace("/");
    } catch (err) {
      setError(
        errorMessage(err).includes("No active account")
          ? "Wrong username or password."
          : errorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <MessagesSquare className="size-5" />
          </span>
          <div>
            <h1 className="font-semibold text-ink">Unified Inbox</h1>
            <p className="text-xs text-muted">Sign in to manage your messages</p>
          </div>
        </div>
        {DEMO_USER && (
          <div className="mb-4 rounded-lg border border-dashed border-line bg-surface-2 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-muted">Login details (local development)</p>
            <p className="mt-1 text-ink">
              Username: <code className="font-mono font-semibold">{DEMO_USER}</code>
              <span className="mx-2 text-muted">·</span>
              Password: <code className="font-mono font-semibold">{DEMO_PASS}</code>
            </p>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Create your account on the backend with <code className="font-mono">python manage.py createsuperuser</code>.
        </p>
      </Card>
    </main>
  );
}

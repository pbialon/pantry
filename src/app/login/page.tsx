"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Mail, Lock, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Nieprawidlowy email lub haslo");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Wystapil blad podczas logowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            placeholder="twoj@email.pl"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Haslo
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Logowanie...
          </>
        ) : (
          "Zaloguj sie"
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Pantry Manager</h1>
          <p className="text-muted-foreground mt-1">Zaloguj sie do swojego konta</p>
        </div>

        <Suspense fallback={<div className="text-center text-muted-foreground">Ladowanie...</div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Zarejestruj sie
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface InviteInfo {
  householdName: string;
  email: string;
  expiresAt: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInviteInfo();
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      const res = await fetch(`/api/household/invite?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setInviteInfo(data);
      } else {
        const data = await res.json();
        setError(data.error || "Zaproszenie jest nieprawidlowe lub wygaslo");
      }
    } catch {
      setError("Nie udalo sie pobrac informacji o zaproszeniu");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (status !== "authenticated") {
      // Redirect to login with return URL
      router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Nie udalo sie dolaczyc do gospodarstwa");
      }
    } catch {
      setError("Wystapil blad");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <X className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Zaproszenie nieprawidlowe</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <Home className="w-4 h-4" />
            Strona glowna
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Dolaczono!</h1>
          <p className="text-muted-foreground mb-6">
            Zostales dodany do gospodarstwa &quot;{inviteInfo?.householdName}&quot;
          </p>
          <p className="text-sm text-muted-foreground">Przekierowuję...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border p-6 text-center">
          <Home className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Zaproszenie</h1>
          <p className="text-muted-foreground mb-6">
            Zostales zaproszony do gospodarstwa domowego
          </p>

          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-lg font-semibold">{inviteInfo?.householdName}</p>
            <p className="text-sm text-muted-foreground">
              Zaproszenie dla: {inviteInfo?.email}
            </p>
          </div>

          {status === "unauthenticated" && (
            <p className="text-sm text-muted-foreground mb-4">
              Zaloguj sie aby dolaczyc do gospodarstwa
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {accepting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : status === "authenticated" ? (
              "Dolacz do gospodarstwa"
            ) : (
              "Zaloguj sie i dolacz"
            )}
          </button>

          <Link
            href="/"
            className="block mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Anuluj
          </Link>
        </div>
      </div>
    </main>
  );
}

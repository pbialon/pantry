"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  Plus,
  Users,
  Mail,
  Copy,
  Check,
  Trash2,
  LogOut,
  Loader2,
  Crown,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface HouseholdMember {
  id: number;
  user_id: number;
  role: "owner" | "member";
  user_name: string;
  user_email: string;
}

interface HouseholdInvite {
  id: number;
  email: string;
  expires_at: string;
}

interface HouseholdData {
  household: { id: number; name: string } | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
  isOwner: boolean;
}

export default function HouseholdSettingsPage() {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    fetchHousehold();
  }, []);

  const fetchHousehold = async () => {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      setError("Nie udalo sie pobrac danych");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHouseholdName.trim() }),
      });

      if (res.ok) {
        await fetchHousehold();
        setNewHouseholdName("");
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError("Wystapil blad");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setInviteLink(null);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const result = await res.json();
      if (res.ok) {
        setInviteLink(result.inviteLink);
        setInviteEmail("");
        await fetchHousehold();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Wystapil blad");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteInvite = async (inviteId: number) => {
    try {
      await fetch(`/api/household/invite?id=${inviteId}`, { method: "DELETE" });
      await fetchHousehold();
    } catch {
      setError("Nie udalo sie usunac zaproszenia");
    }
  };

  const handleLeave = async () => {
    try {
      const res = await fetch("/api/household?action=leave", { method: "DELETE" });
      if (res.ok) {
        setData({ household: null, members: [], invites: [], isOwner: false });
      } else {
        const result = await res.json();
        setError(result.error);
      }
    } catch {
      setError("Wystapil blad");
    }
    setLeaveModal(false);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch("/api/household?action=delete", { method: "DELETE" });
      if (res.ok) {
        setData({ household: null, members: [], invites: [], isOwner: false });
      } else {
        const result = await res.json();
        setError(result.error);
      }
    } catch {
      setError("Wystapil blad");
    }
    setDeleteModal(false);
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrot
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="w-6 h-6" />
          Gospodarstwo domowe
        </h1>
        <p className="text-muted-foreground mt-1">
          Wspoldziel inwentarz z innymi
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {!data?.household ? (
        // No household - show create form
        <div className="bg-card rounded-lg border p-6">
          <h2 className="font-semibold mb-4">Utworz gospodarstwo domowe</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Utworz gospodarstwo domowe aby wspoldzielic inwentarz z inna osoba.
          </p>
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nazwa gospodarstwa
              </label>
              <input
                type="text"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="np. Dom, Mieszkanie"
                className="w-full px-3 py-2 bg-muted rounded-lg text-sm"
                required
                minLength={2}
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newHouseholdName.trim()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Utworz gospodarstwo"
              )}
            </button>
          </form>
        </div>
      ) : (
        // Has household - show management
        <div className="space-y-6">
          {/* Household info */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">{data.household.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {data.members.length} {data.members.length === 1 ? "czlonek" : "czlonkow"}
                </p>
              </div>
              {data.isOwner && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  Wlasciciel
                </span>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Czlonkowie
              </h3>
            </div>
            <div className="divide-y">
              {data.members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.user_name || member.user_email}</p>
                    <p className="text-sm text-muted-foreground">{member.user_email}</p>
                  </div>
                  {member.role === "owner" && (
                    <Crown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite section (owner only) */}
          {data.isOwner && (
            <div className="bg-card rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Zapros kogos
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {inviting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </form>

                {inviteLink && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Link do zaproszenia (wazny 7 dni):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-background rounded-lg text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending invites */}
                {data.invites.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Oczekujace zaproszenia</p>
                    <div className="space-y-2">
                      {data.invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg"
                        >
                          <span className="text-sm">{invite.email}</span>
                          <button
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-4">Akcje</h3>
            <div className="space-y-2">
              {!data.isOwner && (
                <button
                  onClick={() => setLeaveModal(true)}
                  className="w-full px-4 py-2 text-left text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Opusc gospodarstwo
                </button>
              )}
              {data.isOwner && (
                <button
                  onClick={() => setDeleteModal(true)}
                  className="w-full px-4 py-2 text-left text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Usun gospodarstwo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={leaveModal}
        title="Opuscic gospodarstwo?"
        message="Czy na pewno chcesz opuscic gospodarstwo? Twoje dane pozostana wspoldzielone."
        confirmText="Opusc"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={handleLeave}
        onCancel={() => setLeaveModal(false)}
      />

      <ConfirmModal
        isOpen={deleteModal}
        title="Usunac gospodarstwo?"
        message="Czy na pewno chcesz usunac gospodarstwo? Ta operacja jest nieodwracalna. Wszyscy czlonkowie straca dostep do wspoldzielonych danych."
        confirmText="Usun"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
      />
    </main>
  );
}

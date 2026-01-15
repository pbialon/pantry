"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Search, Filter, RefreshCw } from "lucide-react";
import { formatDateTime, translateTransactionType, translateSource } from "@/lib/utils";

interface Transaction {
  id: number;
  product_id: number;
  type: string;
  quantity: number;
  source: string;
  created_at: string;
  product_name?: string;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, sourceFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((acc, t) => {
    const date = new Date(t.created_at).toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrot
          </Link>
          <button
            onClick={fetchTransactions}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            title="Odswiez"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-2xl font-bold">Historia</h1>
        <p className="text-muted-foreground mt-1">
          {transactions.length} transakcji
        </p>
      </header>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Szukaj produktu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Szukaj
          </button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 pr-8 border rounded-lg bg-background text-sm appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="all">Wszystkie typy</option>
              <option value="add">Dodane</option>
              <option value="remove">Usuniete</option>
            </select>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 pr-8 border rounded-lg bg-background text-sm appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="all">Wszystkie zrodla</option>
            <option value="barcode">Barcode</option>
            <option value="receipt">Paragon</option>
            <option value="import">Import</option>
            <option value="manual">Reczne</option>
          </select>
        </div>
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="bg-card rounded-lg border p-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Brak transakcji do wyswietlenia
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                {date}
              </h3>
              <div className="bg-card rounded-lg border divide-y">
                {dayTransactions.map((t) => (
                  <div key={t.id} className="p-4 flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        t.type === "add"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {t.type === "add" ? (
                        <Plus className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {t.product_name || `Produkt #${t.product_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {translateTransactionType(t.type)} {t.quantity} szt.
                        <span className="mx-1">•</span>
                        {translateSource(t.source)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

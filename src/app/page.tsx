"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ScanBarcode, Receipt, ShoppingCart, TrendingUp, Plus, Minus, AlertTriangle } from "lucide-react";
import { formatDateTime, translateTransactionType, translateSource } from "@/lib/utils";

interface Stats {
  totalProducts: number;
  expiringCount: number;
  lowStockCount: number;
  categoriesCount: number;
}

interface Transaction {
  id: number;
  product_id: number;
  type: string;
  quantity: number;
  source: string;
  created_at: string;
  product_name?: string;
}

interface ExpiringItem {
  id: number;
  product: { name: string };
  expiry_date: string;
  quantity: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, expiringCount: 0, lowStockCount: 0, categoriesCount: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, transRes, expiringRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/transactions?limit=10"),
        fetch("/api/inventory?expiring=7"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (transRes.ok) {
        setTransactions(await transRes.json());
      }
      if (expiringRes.ok) {
        setExpiring(await expiringRes.json());
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Pantry Manager</h1>
        <p className="text-muted-foreground mt-1">Zarzadzaj zapasami jedzenia</p>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickAction
          href="/scan"
          icon={<ScanBarcode className="w-6 h-6" />}
          label="Skanuj"
          description="Barcode"
        />
        <QuickAction
          href="/import"
          icon={<ShoppingCart className="w-6 h-6" />}
          label="Importuj"
          description="Liste zakupow"
        />
        <QuickAction
          href="/receipt"
          icon={<Receipt className="w-6 h-6" />}
          label="Paragon"
          description="Skan paragonu"
        />
        <QuickAction
          href="/inventory"
          icon={<Package className="w-6 h-6" />}
          label="Inwentarz"
          description="Wszystkie produkty"
        />
      </section>

      {/* Stock Summary */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Podsumowanie
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Produktow"
            value={loading ? "-" : String(stats.totalProducts)}
          />
          <StatCard
            label="Wygasa wkrotce"
            value={loading ? "-" : String(stats.expiringCount)}
            color={stats.expiringCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Niski stan"
            value={loading ? "-" : String(stats.lowStockCount)}
            color="muted"
          />
          <StatCard
            label="Kategorii"
            value={loading ? "-" : String(stats.categoriesCount)}
          />
        </div>
      </section>

      {/* Expiring Soon */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Wygasajace wkrotce
        </h2>
        {loading ? (
          <div className="bg-card rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : expiring.length === 0 ? (
          <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
            Brak produktow z bliskim terminem waznosci
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {expiring.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} szt.
                  </p>
                </div>
                <div className="text-sm text-amber-600 font-medium">
                  {new Date(item.expiry_date).toLocaleDateString("pl-PL")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Ostatnia aktywnosc</h2>
        {loading ? (
          <div className="bg-card rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
            Brak aktywnosci - zacznij od zeskanowania produktu
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {transactions.map((t) => (
              <div key={t.id} className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-full ${t.type === "add" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                  {t.type === "add" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.product_name || `Produkt #${t.product_id}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {translateTransactionType(t.type)} {t.quantity} szt. ({translateSource(t.source)})
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(t.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border hover:border-primary hover:shadow-md transition-all"
    >
      <div className="text-primary mb-2">{icon}</div>
      <span className="font-medium text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "warning" | "muted";
}) {
  const colorClasses = {
    default: "text-foreground",
    warning: "text-amber-600",
    muted: "text-muted-foreground",
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

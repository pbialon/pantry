"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ScanBarcode, Receipt, ShoppingCart, TrendingUp, Plus, Minus, AlertTriangle, PackageMinus, History, BarChart3, LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
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

interface LowStockItem {
  id: number;
  product: { name: string };
  quantity: number;
}

interface Analytics {
  topConsumed: { product_id: number; product_name: string; total_removed: number }[];
  monthStats: { total_added: number; total_removed: number; unique_products: number };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, expiringCount: 0, lowStockCount: 0, categoriesCount: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, transRes, expiringRes, inventoryRes, analyticsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/transactions?limit=10"),
        fetch("/api/inventory?expiring=7"),
        fetch("/api/inventory"),
        fetch("/api/analytics"),
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
      if (inventoryRes.ok) {
        const inventory = await inventoryRes.json();
        setLowStock(inventory.filter((item: LowStockItem) => item.quantity <= 1));
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pantry Manager</h1>
          <p className="text-muted-foreground mt-1">Zarzadzaj zapasami jedzenia</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[120px]">
              {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Wyloguj"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
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

      {/* Monthly Analytics */}
      {analytics && (analytics.monthStats.total_added > 0 || analytics.monthStats.total_removed > 0) && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ten miesiac
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-card rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">+{analytics.monthStats.total_added || 0}</div>
              <div className="text-xs text-muted-foreground">Dodano</div>
            </div>
            <div className="bg-card rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-red-600">-{analytics.monthStats.total_removed || 0}</div>
              <div className="text-xs text-muted-foreground">Zuzyte</div>
            </div>
            <div className="bg-card rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold">{analytics.monthStats.unique_products || 0}</div>
              <div className="text-xs text-muted-foreground">Produktow</div>
            </div>
          </div>

          {analytics.topConsumed.length > 0 && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Najczesciej zuzywane</h3>
              <div className="space-y-2">
                {analytics.topConsumed.slice(0, 3).map((item, index) => (
                  <div key={item.product_id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}.</span>
                    <span className="flex-1 truncate text-sm">{item.product_name}</span>
                    <span className="text-sm text-muted-foreground">{item.total_removed} szt.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

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
            {expiring.slice(0, 5).map((item) => {
              const expiryDate = new Date(item.expiry_date);
              const now = new Date();
              const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              const isExpired = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 2;

              const statusColor = isExpired
                ? "text-destructive bg-destructive/10"
                : isUrgent
                ? "text-amber-600 bg-amber-50"
                : "text-muted-foreground bg-muted";

              const statusText = isExpired
                ? "Przeterminowane!"
                : daysUntil === 0
                ? "Wygasa dzis!"
                : daysUntil === 1
                ? "Wygasa jutro"
                : `${daysUntil} dni`;

              return (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} szt.
                    </p>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
                    {statusText}
                  </div>
                </div>
              );
            })}
            {expiring.length > 5 && (
              <Link
                href="/inventory"
                className="block p-3 text-center text-sm text-primary hover:bg-muted transition-colors"
              >
                Zobacz wszystkie ({expiring.length})
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PackageMinus className="w-5 h-5" />
            Niski stan
          </h2>
          <div className="bg-card rounded-lg border divide-y">
            {lowStock.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product.name}</p>
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded text-amber-600 bg-amber-50">
                  {item.quantity} szt.
                </div>
              </div>
            ))}
            {lowStock.length > 5 && (
              <Link
                href="/inventory"
                className="block p-3 text-center text-sm text-primary hover:bg-muted transition-colors"
              >
                Zobacz wszystkie ({lowStock.length})
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Ostatnia aktywnosc
          </h2>
          <Link
            href="/history"
            className="text-sm text-primary hover:underline"
          >
            Zobacz wszystko
          </Link>
        </div>
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

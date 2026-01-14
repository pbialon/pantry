import Link from "next/link";
import { Package, ScanBarcode, Receipt, ShoppingCart, TrendingUp } from "lucide-react";

export default function Dashboard() {
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
          <StatCard label="Produktow" value="0" />
          <StatCard label="Wygasa wkrotce" value="0" color="warning" />
          <StatCard label="Niski stan" value="0" color="muted" />
          <StatCard label="Kategorii" value="0" />
        </div>
      </section>

      {/* Expiring Soon */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Wygasajace wkrotce</h2>
        <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
          Brak produktow z bliskim terminem waznosci
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Ostatnia aktywnosc</h2>
        <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
          Brak aktywnosci - zacznij od zeskanowania produktu
        </div>
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

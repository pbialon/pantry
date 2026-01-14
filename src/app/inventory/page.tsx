"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Trash2, Package } from "lucide-react";
import type { InventoryWithProduct } from "@/lib/db/schema";
import { daysUntil, getExpiryStatus, formatDate } from "@/lib/utils";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number, quantity: number = 1) => {
    try {
      const res = await fetch(`/api/inventory?id=${id}&quantity=${quantity}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const groupedInventory = inventory.reduce((acc, item) => {
    const category = item.category?.name || "Inne";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryWithProduct[]>);

  const filteredCategories = Object.entries(groupedInventory).filter(
    ([category]) => filter === "all" || category === filter
  );

  const categories = ["all", ...Object.keys(groupedInventory)];

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrot
        </Link>
        <h1 className="text-2xl font-bold">Inwentarz</h1>
        <p className="text-muted-foreground mt-1">
          {inventory.length} produktow w magazynie
        </p>
      </header>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-card border hover:bg-accent"
            }`}
          >
            {cat === "all" ? "Wszystkie" : cat}
          </button>
        ))}
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Pusty inwentarz</h2>
          <p className="text-muted-foreground mb-4">
            Zacznij od zeskanowania produktu lub importu listy zakupow
          </p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Dodaj produkt
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {category} ({items.length})
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function InventoryCard({
  item,
  onRemove,
}: {
  item: InventoryWithProduct;
  onRemove: (id: number, quantity?: number) => void;
}) {
  const expiryDays = item.expiry_date ? daysUntil(item.expiry_date) : null;
  const expiryStatus = expiryDays !== null ? getExpiryStatus(expiryDays) : null;

  const statusColors = {
    expired: "text-destructive bg-destructive/10",
    warning: "text-amber-600 bg-amber-50",
    ok: "text-muted-foreground bg-muted",
  };

  return (
    <div className="p-4 bg-card rounded-lg border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{item.product.name}</h3>
          {item.product.brand && (
            <p className="text-sm text-muted-foreground">{item.product.brand}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="font-medium">
              {item.quantity} {item.quantity_unit}
            </span>
            {item.location && (
              <span className="text-muted-foreground">• {item.location}</span>
            )}
          </div>
          {item.expiry_date && expiryStatus && (
            <div
              className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs ${statusColors[expiryStatus]}`}
            >
              {expiryStatus === "expired"
                ? "Przeterminowany"
                : expiryStatus === "warning"
                ? `Wygasa za ${expiryDays} dni`
                : `Wazny do ${formatDate(item.expiry_date)}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRemove(item.id, 1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Zmniejsz ilosc"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(item.id, item.quantity)}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            title="Usun"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

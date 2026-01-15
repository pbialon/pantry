"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Trash2, Package, RefreshCw } from "lucide-react";
import type { InventoryWithProduct } from "@/lib/db/schema";
import { daysUntil, getExpiryStatus, formatDate } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: InventoryWithProduct | null }>({
    isOpen: false,
    item: null,
  });
  const [deleteAllModal, setDeleteAllModal] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAdd = useCallback(async (id: number, productId: number) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
          source: "manual",
        }),
      });
      if (res.ok) {
        // Update local state
        setInventory((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      }
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleRemove = useCallback(async (id: number, quantity: number = 1) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/inventory?id=${id}&quantity=${quantity}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Update local state immediately for better UX
        setInventory((prev) =>
          prev
            .map((item) => {
              if (item.id === id) {
                const newQty = item.quantity - quantity;
                if (newQty <= 0) return null;
                return { ...item, quantity: newQty };
              }
              return item;
            })
            .filter((item): item is InventoryWithProduct => item !== null)
        );
      } else {
        const error = await res.json();
        console.error("Error removing item:", error);
      }
    } catch (error) {
      console.error("Error removing item:", error);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const openDeleteModal = useCallback((item: InventoryWithProduct) => {
    setDeleteModal({ isOpen: true, item });
  }, []);

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, item: null });
  };

  const confirmDelete = () => {
    if (deleteModal.item) {
      handleRemove(deleteModal.item.id, deleteModal.item.quantity);
    }
    closeDeleteModal();
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory?all=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setInventory([]);
      }
    } catch (error) {
      console.error("Error clearing inventory:", error);
    } finally {
      setLoading(false);
      setDeleteAllModal(false);
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
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
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
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrot
          </Link>
          <div className="flex items-center gap-1">
            {inventory.length > 0 && (
              <button
                onClick={() => setDeleteAllModal(true)}
                className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                title="Usun wszystko"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={fetchInventory}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              title="Odswiez"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Inwentarz</h1>
        <p className="text-muted-foreground mt-1">
          {inventory.length} {inventory.length === 1 ? "produkt" : "produktow"} w magazynie
        </p>
      </header>

      {/* Mobile: Horizontal scrollable tabs */}
      <div className="md:hidden mb-4 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => {
            const count = cat === "all"
              ? inventory.length
              : groupedInventory[cat]?.length || 0;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "Wszystkie" : cat}
                <span className={`ml-1.5 ${filter === cat ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop: Sidebar - category filter */}
        <aside className="hidden md:block w-48 flex-shrink-0">
          <nav className="sticky top-8 space-y-1">
            {categories.map((cat) => {
              const count = cat === "all"
                ? inventory.length
                : groupedInventory[cat]?.length || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filter === cat
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="block truncate">
                    {cat === "all" ? "Wszystkie" : cat}
                  </span>
                  <span className={`text-xs ${filter === cat ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {count} {count === 1 ? "produkt" : "produktow"}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">

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
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    onDelete={openDeleteModal}
                    isLoading={actionLoading === item.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Usunac produkt?"
        message={deleteModal.item ? `Czy na pewno chcesz usunac "${deleteModal.item.product.name}" z inwentarza?` : ""}
        confirmText="Usun"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />

      <ConfirmModal
        isOpen={deleteAllModal}
        title="Usunac wszystko?"
        message={`Czy na pewno chcesz usunac wszystkie ${inventory.length} produktow z inwentarza? Ta operacja jest nieodwracalna.`}
        confirmText="Usun wszystko"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllModal(false)}
      />
    </main>
  );
}

const InventoryCard = memo(function InventoryCard({
  item,
  onAdd,
  onRemove,
  onDelete,
  isLoading,
}: {
  item: InventoryWithProduct;
  onAdd: (id: number, productId: number) => void;
  onRemove: (id: number, quantity?: number) => void;
  onDelete: (item: InventoryWithProduct) => void;
  isLoading: boolean;
}) {
  const expiryDays = item.expiry_date ? daysUntil(item.expiry_date) : null;
  const expiryStatus = expiryDays !== null ? getExpiryStatus(expiryDays) : null;

  const statusColors = {
    expired: "text-destructive bg-destructive/10",
    warning: "text-amber-600 bg-amber-50",
    ok: "text-muted-foreground bg-muted",
  };

  const locationLabels: Record<string, string> = {
    pantry: "Spizarnia",
    fridge: "Lodowka",
    freezer: "Zamrazarka",
  };

  return (
    <div className={`p-4 bg-card rounded-lg border transition-opacity ${isLoading ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{item.product.name}</h3>
          {item.product.brand && (
            <p className="text-sm text-muted-foreground">{item.product.brand}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="font-medium tabular-nums">
              {item.quantity} szt.
            </span>
            {item.location && (
              <span className="text-muted-foreground">
                • {locationLabels[item.location] || item.location}
              </span>
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
        <div className="flex items-center gap-0.5 md:gap-1">
          <button
            onClick={() => {
              if (item.quantity <= 1) {
                onDelete(item);
              } else {
                onRemove(item.id, 1);
              }
            }}
            disabled={isLoading}
            className="p-2.5 md:p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 active:bg-muted"
            title="Zmniejsz ilosc o 1"
          >
            <Minus className="w-5 h-5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => onAdd(item.id, item.product_id)}
            disabled={isLoading}
            className="p-2.5 md:p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors disabled:opacity-50 active:bg-primary/10"
            title="Zwieksz ilosc o 1"
          >
            <Plus className="w-5 h-5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => onDelete(item)}
            disabled={isLoading}
            className="p-2.5 md:p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors disabled:opacity-50 active:bg-destructive/10"
            title="Usun calkowicie"
          >
            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  RefreshCw,
  Check,
  Sparkles,
  Package,
  X,
} from "lucide-react";
import type { ShoppingItem } from "@/lib/db/queries";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface Suggestion {
  product_id: number;
  product_name: string;
  brand: string | null;
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [clearModal, setClearModal] = useState(false);

  useEffect(() => {
    fetchShoppingList();
  }, []);

  const fetchShoppingList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error fetching shopping list:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/shopping/generate");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await fetch(`/api/shopping?id=${id}`, { method: "PATCH" });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/shopping?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleClearPurchased = async () => {
    try {
      const res = await fetch("/api/shopping?clearPurchased=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => !item.is_purchased));
      }
    } catch (error) {
      console.error("Error clearing purchased:", error);
    } finally {
      setClearModal(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: newItemName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...created, ...prev]);
        setNewItemName("");
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleAddSuggestion = async (suggestion: Suggestion) => {
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: suggestion.product_id,
          product_name: suggestion.product_name,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...created, ...prev]);
        setSuggestions((prev) =>
          prev.filter((s) => s.product_id !== suggestion.product_id)
        );
      }
    } catch (error) {
      console.error("Error adding suggestion:", error);
    }
  };

  const purchasedCount = items.filter((i) => i.is_purchased).length;
  const unpurchasedItems = items.filter((i) => !i.is_purchased);
  const purchasedItems = items.filter((i) => i.is_purchased);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-lg">
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
            {purchasedCount > 0 && (
              <button
                onClick={() => setClearModal(true)}
                className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                title="Usun kupione"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={fetchShoppingList}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              title="Odswiez"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Lista zakupow</h1>
        <p className="text-muted-foreground mt-1">
          {items.length === 0
            ? "Pusta lista"
            : `${unpurchasedItems.length} do kupienia${
                purchasedCount > 0 ? `, ${purchasedCount} kupionych` : ""
              }`}
        </p>
      </header>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj
        </button>
        <button
          onClick={fetchSuggestions}
          className="flex-1 py-2.5 px-4 border rounded-lg font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generuj
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="mb-6 p-4 bg-card rounded-lg border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nazwa produktu..."
              autoFocus
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewItemName("");
              }}
              className="px-4 py-2 border rounded-lg hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Suggestions modal */}
      {showSuggestions && (
        <div className="mb-6 p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Sugestie z historii</h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak sugestii - nie znaleziono produktow do uzupelnienia
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <div
                  key={s.product_id}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{s.product_name}</p>
                    {s.brand && (
                      <p className="text-xs text-muted-foreground">{s.brand}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddSuggestion(s)}
                    className="p-1.5 hover:bg-primary/10 hover:text-primary rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Pusta lista zakupow</h2>
          <p className="text-muted-foreground mb-4">
            Dodaj produkty reczne lub wygeneruj z historii
          </p>
        </div>
      )}

      {/* Shopping list */}
      {unpurchasedItems.length > 0 && (
        <div className="space-y-2 mb-6">
          {unpurchasedItems.map((item) => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Purchased items */}
      {purchasedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Kupione ({purchasedItems.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {purchasedItems.map((item) => (
              <ShoppingItemCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={clearModal}
        title="Usunac kupione?"
        message={`Czy na pewno chcesz usunac ${purchasedCount} kupionych produktow z listy?`}
        confirmText="Usun"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={handleClearPurchased}
        onCancel={() => setClearModal(false)}
      />
    </main>
  );
}

function ShoppingItemCard({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className={`p-4 bg-card rounded-lg border flex items-center gap-3 ${
        item.is_purchased ? "bg-muted/50" : ""
      }`}
    >
      <button
        onClick={() => onToggle(item.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.is_purchased
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground hover:border-primary"
        }`}
      >
        {item.is_purchased && <Check className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            item.is_purchased ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.product_name}
        </p>
        {item.quantity > 1 && (
          <p className="text-sm text-muted-foreground">{item.quantity} szt.</p>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

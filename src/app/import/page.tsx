"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle, AlertCircle, Pencil, X, Check } from "lucide-react";
import { ProductMatchDialog } from "@/components/ui/ProductMatchDialog";
import type { Product } from "@/lib/db/schema";

interface Category {
  id: number;
  name: string;
  icon: string | null;
}

interface CategorizedItem {
  original: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  selected: boolean;
  editing: boolean;
}

interface MatchDialogState {
  isOpen: boolean;
  item: CategorizedItem | null;
  similarProducts: Product[];
  resolve: ((productId: number | null) => void) | null;
}


export default function ImportPage() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<CategorizedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [matchDialog, setMatchDialog] = useState<MatchDialogState>({
    isOpen: false,
    item: null,
    similarProducts: [],
    resolve: null,
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.ok ? res.json() : [])
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const searchSimilarProducts = useCallback(async (name: string, brand: string | null): Promise<Product[]> => {
    try {
      const params = new URLSearchParams({ name });
      if (brand) params.append("brand", brand);
      const res = await fetch(`/api/products/search?${params}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Error searching products:", err);
    }
    return [];
  }, []);

  const showMatchDialog = useCallback((item: CategorizedItem, similarProducts: Product[]): Promise<number | null> => {
    return new Promise((resolve) => {
      setMatchDialog({
        isOpen: true,
        item,
        similarProducts,
        resolve,
      });
    });
  }, []);

  const handleMatchDialogSelect = useCallback((productId: number | null) => {
    if (matchDialog.resolve) {
      matchDialog.resolve(productId);
    }
    setMatchDialog({
      isOpen: false,
      item: null,
      similarProducts: [],
      resolve: null,
    });
  }, [matchDialog.resolve]);

  const handleMatchDialogCancel = useCallback(() => {
    if (matchDialog.resolve) {
      matchDialog.resolve(null);
    }
    setMatchDialog({
      isOpen: false,
      item: null,
      similarProducts: [],
      resolve: null,
    });
  }, [matchDialog.resolve]);

  const handleCategorize = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: lines }),
      });

      if (!res.ok) {
        throw new Error("Blad kategoryzacji");
      }

      const categorized = await res.json();

      const parsed: CategorizedItem[] = lines.map((line, index) => {
        const cat = categorized[index] || {};
        return {
          original: line,
          name: cat.name || line,
          brand: cat.brand || null,
          category: cat.category || "Spizarnia",
          quantity: 1,
          selected: true,
          editing: false,
        };
      });

      setItems(parsed);
    } catch (err) {
      console.error("Categorization error:", err);
      // Fallback to simple parsing if AI fails
      const parsed: CategorizedItem[] = lines.map((line) => ({
        original: line,
        name: line,
        brand: null,
        category: "Spizarnia",
        quantity: 1,
        selected: true,
        editing: false,
      }));
      setItems(parsed);
      setError("AI niedostepne - uzyto prostego parsowania");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    if (items[index].editing) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const startEditing = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, editing: true } : { ...item, editing: false }
      )
    );
  };

  const cancelEditing = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, editing: false } : item
      )
    );
  };

  const updateItem = (index: number, field: keyof CategorizedItem, value: string | number | null) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const saveEditing = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, editing: false } : item
      )
    );
  };

  const handleImport = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setLoading(true);
    setError(null);
    let imported = 0;
    let skipped = 0;

    try {
      for (const item of selectedItems) {
        // Search for similar products first
        const similarProducts = await searchSimilarProducts(item.name, item.brand);

        let productId: number | null = null;

        if (similarProducts.length > 0) {
          // Show dialog and wait for user selection
          const selectedProductId = await showMatchDialog(item, similarProducts);

          if (selectedProductId === null) {
            // User chose to create new or dialog returned null (create new)
            // If user cancelled (pressed Anuluj), we still create new product
            // To skip item entirely, user would need to deselect it before import
          }

          if (selectedProductId !== null && selectedProductId > 0) {
            // User selected existing product
            productId = selectedProductId;
          }
        }

        // Create new product if no existing was selected
        if (productId === null) {
          const productData: { name: string; brand?: string; category?: string } = {
            name: item.name,
          };
          if (item.brand) {
            productData.brand = item.brand;
          }
          if (item.category) {
            productData.category = item.category;
          }

          const productRes = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData),
          });

          if (!productRes.ok) {
            const errData = await productRes.json();
            console.error("Product creation failed:", errData);
            skipped++;
            continue;
          }

          const product = await productRes.json();
          productId = product.id;
        }

        // Add to inventory
        const inventoryRes = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            quantity: item.quantity,
            source: "import",
          }),
        });

        if (inventoryRes.ok) {
          imported++;
        } else {
          const errData = await inventoryRes.json();
          console.error("Inventory add failed:", errData);
          skipped++;
        }
      }

      setSuccessCount(imported);
      setInput("");
      setItems([]);
      if (skipped > 0) {
        setError(`Pomineto ${skipped} produktow z powodu bledow`);
      }
    } catch (err) {
      console.error("Import error:", err);
      setError("Blad podczas importu");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold">Importuj liste zakupow</h1>
        <p className="text-muted-foreground mt-1">
          Wklej liste produktow z zamowienia online
        </p>
      </header>

      {successCount > 0 && (
        <div className="mb-4 p-4 bg-primary/10 text-primary rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Zaimportowano {successCount} produktow!
          <Link href="/inventory" className="ml-auto underline">
            Zobacz inwentarz
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="products" className="block text-sm font-medium mb-2">
              Lista produktow (jeden produkt na linie)
            </label>
            <textarea
              id="products"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`np:\nMleko UHT 3.2% Laciate 1L\nChleb tostowy pelnoziarnisty\nMaslo Ekstra 200g`}
              rows={10}
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <button
            onClick={handleCategorize}
            disabled={loading || !input.trim()}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {loading ? "Przetwarzanie..." : "Kategoryzuj"}
          </button>

          <p className="text-sm text-muted-foreground text-center">
            AI automatycznie skategoryzuje produkty (wymaga OPENAI_API_KEY)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                onClick={() => toggleItem(index)}
                className={`p-4 rounded-lg border transition-colors ${
                  item.selected
                    ? "bg-primary/5 border-primary"
                    : "bg-card opacity-50"
                } ${item.editing ? "cursor-default" : "cursor-pointer"}`}
              >
                {item.editing ? (
                  // Edit mode
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Nazwa</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Marka</label>
                      <input
                        type="text"
                        value={item.brand || ""}
                        onChange={(e) => updateItem(index, "brand", e.target.value || null)}
                        placeholder="(opcjonalnie)"
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Kategoria</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(index, "category", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                        {!categories.find(c => c.name === item.category) && (
                          <option value={item.category}>{item.category}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Ilosc (szt.)</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        min="1"
                        step="1"
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => cancelEditing(index)}
                        className="flex-1 py-2 px-3 border rounded-lg text-sm hover:bg-accent transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Anuluj
                      </button>
                      <button
                        onClick={() => saveEditing(index)}
                        className="flex-1 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Zapisz
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.selected ? (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                        {item.quantity > 1 && ` • ${item.quantity} szt.`}
                        {item.brand && ` • ${item.brand}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        z: {item.original}
                      </p>
                    </div>
                    <button
                      onClick={(e) => startEditing(index, e)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                      title="Edytuj"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setItems([])}
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleImport}
              disabled={loading || items.filter((i) => i.selected).length === 0}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Importowanie..."
                : `Importuj (${items.filter((i) => i.selected).length})`}
            </button>
          </div>
        </div>
      )}

      <ProductMatchDialog
        isOpen={matchDialog.isOpen}
        productName={matchDialog.item?.name || ""}
        productBrand={matchDialog.item?.brand || undefined}
        similarProducts={matchDialog.similarProducts}
        onSelect={handleMatchDialogSelect}
        onCancel={handleMatchDialogCancel}
      />
    </main>
  );
}

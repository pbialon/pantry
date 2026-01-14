"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle, AlertCircle } from "lucide-react";

interface CategorizedItem {
  original: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: string | null;
  quantity_unit: string | null;
  selected: boolean;
}

export default function ImportPage() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<CategorizedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

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
          quantity: cat.quantity || null,
          quantity_unit: cat.quantity_unit || null,
          selected: true,
        };
      });

      setItems(parsed);
    } catch (err) {
      console.error("Categorization error:", err);
      // Fallback to simple parsing if AI fails
      const parsed: CategorizedItem[] = lines.map((line) => ({
        original: line,
        name: line.replace(/\d+[.,]?\d*\s*(szt|kg|g|l|ml)?\.?/gi, "").trim() || line,
        brand: null,
        category: "Spizarnia",
        quantity: line.match(/\d+[.,]?\d*/)?.[0] || null,
        quantity_unit: line.match(/(szt|kg|g|l|ml)/i)?.[0] || null,
        selected: true,
      }));
      setItems(parsed);
      setError("AI niedostepne - uzyto prostego parsowania");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleImport = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setLoading(true);
    setError(null);
    let imported = 0;

    try {
      for (const item of selectedItems) {
        // Create product - don't send null values, omit them instead
        const productData: { name: string; brand?: string } = {
          name: item.name,
        };
        if (item.brand) {
          productData.brand = item.brand;
        }

        const productRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!productRes.ok) {
          const errData = await productRes.json();
          console.error("Product creation failed:", errData);
          continue;
        }

        const product = await productRes.json();

        // Add to inventory
        const inventoryRes = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            quantity: 1,
            source: "import",
          }),
        });

        if (inventoryRes.ok) {
          imported++;
        } else {
          const errData = await inventoryRes.json();
          console.error("Inventory add failed:", errData);
        }
      }

      setSuccessCount(imported);
      setInput("");
      setItems([]);
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
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  item.selected
                    ? "bg-primary/5 border-primary"
                    : "bg-card opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {item.selected ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.category}
                      {item.quantity && ` • ${item.quantity}${item.quantity_unit || ""}`}
                      {item.brand && ` • ${item.brand}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      z: {item.original}
                    </p>
                  </div>
                </div>
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
    </main>
  );
}

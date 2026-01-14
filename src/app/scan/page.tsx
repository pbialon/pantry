"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Keyboard, Plus, CheckCircle } from "lucide-react";

interface FoundProduct {
  barcode: string;
  name: string;
  brand?: string;
  image_url?: string;
  fromLocal: boolean;
  localProductId?: number;
}

export default function ScanPage() {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoundProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    setProduct(null);
    setAdded(false);

    try {
      // First check if product exists locally
      const localRes = await fetch(`/api/products?barcode=${barcode}`);
      if (localRes.ok) {
        const localProduct = await localRes.json();
        setProduct({
          barcode,
          name: localProduct.name,
          brand: localProduct.brand,
          image_url: localProduct.image_url,
          fromLocal: true,
          localProductId: localProduct.id,
        });
        setLoading(false);
        return;
      }

      // Lookup in Open Food Facts
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();

      if (data.status === 1) {
        setProduct({
          barcode,
          name: data.product.product_name || data.product.product_name_pl || "Nieznana nazwa",
          brand: data.product.brands,
          image_url: data.product.image_front_small_url,
          fromLocal: false,
        });
      } else {
        setError("Produkt nie znaleziony w Open Food Facts. Mozesz dodac go recznie.");
      }
    } catch {
      setError("Blad podczas wyszukiwania");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = async (action: "add" | "remove") => {
    if (!product) return;

    setLoading(true);

    try {
      let productId = product.localProductId;

      // If product doesn't exist locally, create it first
      if (!productId) {
        const productData: { name: string; barcode: string; brand?: string; image_url?: string } = {
          name: product.name,
          barcode: product.barcode,
        };
        if (product.brand) productData.brand = product.brand;
        if (product.image_url) productData.image_url = product.image_url;

        const createRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!createRes.ok) {
          throw new Error("Nie udalo sie utworzyc produktu");
        }

        const newProduct = await createRes.json();
        productId = newProduct.id;
      }

      if (action === "add") {
        // Add to inventory
        const inventoryRes = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            quantity: 1,
            source: "barcode",
          }),
        });

        if (!inventoryRes.ok) {
          throw new Error("Nie udalo sie dodac do inwentarza");
        }
      } else {
        // For remove, we'd need to find the inventory item first
        // This is simplified - in a real app we'd show a list of matching items
        const inventoryRes = await fetch("/api/inventory");
        const inventory = await inventoryRes.json();
        const item = inventory.find((i: { product_id: number }) => i.product_id === productId);

        if (item) {
          await fetch(`/api/inventory?id=${item.id}&quantity=1`, {
            method: "DELETE",
          });
        }
      }

      setAdded(true);
      setBarcode("");

      // Reset after 2 seconds
      setTimeout(() => {
        setProduct(null);
        setAdded(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad podczas dodawania");
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setProduct(null);
    setError(null);
    setBarcode("");
    setAdded(false);
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
        <h1 className="text-2xl font-bold">Skanuj kod kreskowy</h1>
      </header>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
            mode === "camera"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover:bg-accent"
          }`}
        >
          <Camera className="w-5 h-5" />
          Kamera
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
            mode === "manual"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover:bg-accent"
          }`}
        >
          <Keyboard className="w-5 h-5" />
          Recznie
        </button>
      </div>

      {mode === "camera" ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Skanowanie kamera bedzie dostepne po dodaniu biblioteki ZXing-js
          </p>
          <p className="text-sm text-muted-foreground">
            Na razie uzyj trybu recznego lub skanera USB
          </p>
        </div>
      ) : !product ? (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium mb-2">
              Kod kreskowy (EAN/UPC)
            </label>
            <input
              type="text"
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="np. 5901234123457"
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !barcode.trim()}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Szukam..." : "Szukaj"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Product card */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex gap-4">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-20 h-20 object-contain rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-medium">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {product.barcode}
                </p>
                {product.fromLocal && (
                  <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    W bazie lokalnej
                  </span>
                )}
              </div>
            </div>
          </div>

          {added ? (
            <div className="p-4 bg-primary/10 text-primary rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Dodano do inwentarza!
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleAddToInventory("remove")}
                disabled={loading}
                className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                Wyrzuc (-1)
              </button>
              <button
                onClick={() => handleAddToInventory("add")}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Dodaj (+1)
              </button>
            </div>
          )}

          <button
            onClick={resetSearch}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skanuj kolejny
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* USB Scanner hint */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Skaner USB</h3>
        <p className="text-sm text-muted-foreground">
          Jesli masz skaner USB, po prostu zeskanuj kod - zostanie automatycznie wykryty
          (skanery USB emuluja klawiature i wysylaja kod + Enter)
        </p>
      </div>
    </main>
  );
}

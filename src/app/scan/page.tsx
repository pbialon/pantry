"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Camera, Keyboard, Plus, CheckCircle, Edit3, Usb } from "lucide-react";
import { useUSBScanner } from "@/hooks/useUSBScanner";

// Dynamic import to avoid SSR issues with camera
const CameraScanner = dynamic(
  () => import("@/components/scanner/CameraScanner"),
  { ssr: false }
);

interface FoundProduct {
  barcode: string;
  name: string;
  brand?: string;
  image_url?: string;
  fromLocal: boolean;
  localProductId?: number;
}

export default function ScanPage() {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoundProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualName, setManualName] = useState("");
  const [usbDetected, setUsbDetected] = useState(false);

  // Handle barcode scan (from camera or USB)
  const handleBarcodeScan = useCallback(async (code: string) => {
    if (loading) return;

    setBarcode(code);
    setLoading(true);
    setError(null);
    setProduct(null);
    setAdded(false);
    setManualEntry(false);

    try {
      // First check if product exists locally
      const localRes = await fetch(`/api/products?barcode=${code}`);
      if (localRes.ok) {
        const localProduct = await localRes.json();
        setProduct({
          barcode: code,
          name: localProduct.name,
          brand: localProduct.brand,
          image_url: localProduct.image_url,
          fromLocal: true,
          localProductId: localProduct.id,
        });
        setLoading(false);
        return;
      }

      // Lookup in Open Food Facts (world)
      let data = await fetchOpenFoodFacts(code, "world");

      // Fallback to Polish database
      if (data.status !== 1) {
        data = await fetchOpenFoodFacts(code, "pl");
      }

      if (data.status === 1) {
        const p = data.product;
        setProduct({
          barcode: code,
          name: p.product_name_pl || p.product_name || "Nieznana nazwa",
          brand: p.brands,
          image_url: p.image_front_small_url || p.image_url,
          fromLocal: false,
        });
      } else {
        setManualEntry(true);
        setManualName("");
      }
    } catch {
      setError("Blad podczas wyszukiwania");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // USB Scanner listener
  useUSBScanner({
    onScan: (code) => {
      setUsbDetected(true);
      setTimeout(() => setUsbDetected(false), 2000);
      handleBarcodeScan(code);
    },
    enabled: !loading && !product,
  });

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    handleBarcodeScan(barcode.trim());
  };

  const fetchOpenFoodFacts = async (code: string, region: string) => {
    const res = await fetch(
      `https://${region}.openfoodfacts.org/api/v0/product/${code}.json`
    );
    return res.json();
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) return;

    setProduct({
      barcode,
      name: manualName.trim(),
      fromLocal: false,
    });
    setManualEntry(false);
  };

  const handleAddToInventory = async (action: "add" | "remove") => {
    if (!product) return;

    setLoading(true);

    try {
      let productId = product.localProductId;

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
    setManualEntry(false);
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

      {/* USB Scanner indicator */}
      {usbDetected && (
        <div className="mb-4 p-3 bg-primary/10 text-primary rounded-lg flex items-center gap-2 text-sm">
          <Usb className="w-4 h-4" />
          Wykryto skan USB
        </div>
      )}

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

      {/* Loading overlay */}
      {loading && (
        <div className="mb-4 p-4 bg-muted rounded-lg text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Szukam produktu...</p>
        </div>
      )}

      {/* Main content based on state */}
      {!loading && !product && !manualEntry && (
        <>
          {mode === "camera" ? (
            <CameraScanner
              onScan={handleBarcodeScan}
              onError={(err) => setError(err)}
            />
          ) : (
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
                  placeholder="np. 5900497017848"
                  className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!barcode.trim()}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Szukaj
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Przykladowe kody: 5900497017848 (7UP), 5901234123457
              </p>
            </form>
          )}
        </>
      )}

      {/* Manual entry when not found */}
      {!loading && manualEntry && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Kod <span className="font-mono font-medium">{barcode}</span> nie znaleziony w bazie.
            </p>
            <p className="text-sm">Wprowadz nazwe produktu recznie:</p>
          </div>

          <div>
            <label htmlFor="productName" className="block text-sm font-medium mb-2">
              Nazwa produktu
            </label>
            <input
              type="text"
              id="productName"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="np. Tymbark Jablko 1L"
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetSearch}
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim()}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Edit3 className="w-5 h-5" />
              Dodaj
            </button>
          </div>
        </div>
      )}

      {/* Product found */}
      {!loading && product && (
        <div className="space-y-4">
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
                className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                Wyrzuc (-1)
              </button>
              <button
                onClick={() => handleAddToInventory("add")}
                className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
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

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* USB Scanner hint */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Usb className="w-4 h-4" />
          <h3 className="font-medium">Skaner USB</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Skaner USB jest aktywny. Po prostu zeskanuj kod - zostanie automatycznie wykryty.
        </p>
      </div>
    </main>
  );
}

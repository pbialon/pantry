"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Keyboard } from "lucide-react";

export default function ScanPage() {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      // First check if product exists locally
      const localRes = await fetch(`/api/products?barcode=${barcode}`);
      if (localRes.ok) {
        const product = await localRes.json();
        setResult(`Znaleziono: ${product.name}`);
        return;
      }

      // Lookup in Open Food Facts
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();

      if (data.status === 1) {
        setResult(`Open Food Facts: ${data.product.product_name || "Nieznana nazwa"}`);
      } else {
        setResult("Produkt nie znaleziony");
      }
    } catch {
      setResult("Blad podczas wyszukiwania");
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
              placeholder="np. 5901234123457"
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Szukaj
          </button>
        </form>
      )}

      {result && (
        <div className="mt-6 p-4 bg-card rounded-lg border">
          <p className="font-medium">{result}</p>
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

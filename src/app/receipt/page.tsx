"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Pencil,
  X,
  Check,
} from "lucide-react";

interface ParsedProduct {
  name: string;
  brand?: string;
  category?: string;
  quantity: number;
  selected: boolean;
}

const CATEGORIES = [
  "Nabial i jajka",
  "Mieso i ryby",
  "Warzywa i owoce",
  "Pieczywo",
  "Spizarnia",
  "Napoje",
  "Mrozonki",
  "Przekaski",
  "Chemia domowa",
  "Inne",
];

type Step = "upload" | "processing" | "select" | "done";

export default function ReceiptPage() {
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setProducts([]);
      setError(null);
      setStep("processing");
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const base64 = image.includes(",") ? image.split(",")[1] : image;
      const fileType = image.match(/data:([^;]+)/)?.[1] || "image/jpeg";

      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, fileType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Blad przetwarzania");
      }

      const data = await res.json();

      if (!data.products || data.products.length === 0) {
        setError("Nie znaleziono produktow na paragonie");
        return;
      }

      setProducts(
        data.products.map((p: { name: string; brand?: string; category?: string; quantity?: number }) => ({
          ...p,
          quantity: typeof p.quantity === "number" ? p.quantity : 1,
          selected: true,
        }))
      );
      setStep("select");
    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : "Blad przetwarzania");
    } finally {
      setLoading(false);
    }
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; brand: string; category: string; quantity: number }>({
    name: "",
    brand: "",
    category: "",
    quantity: 1,
  });

  const toggleProduct = (index: number) => {
    if (editingIndex !== null) return; // Don't toggle while editing
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const startEditing = (index: number) => {
    const product = products[index];
    setEditForm({
      name: product.name,
      brand: product.brand || "",
      category: product.category || "Inne",
      quantity: product.quantity,
    });
    setEditingIndex(index);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const saveEditing = () => {
    if (editingIndex === null) return;
    setProducts((prev) =>
      prev.map((p, i) =>
        i === editingIndex
          ? {
              ...p,
              name: editForm.name,
              brand: editForm.brand || undefined,
              category: editForm.category,
              quantity: editForm.quantity,
            }
          : p
      )
    );
    setEditingIndex(null);
  };

  const handleImport = async () => {
    const selected = products.filter((p) => p.selected);
    if (selected.length === 0) return;

    setLoading(true);
    setError(null);
    let imported = 0;

    try {
      for (const item of selected) {
        const productData: { name: string; brand?: string; category?: string } = {
          name: item.name,
        };
        if (item.brand) productData.brand = item.brand;
        if (item.category) productData.category = item.category;

        const productRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!productRes.ok) continue;

        const product = await productRes.json();

        const inventoryRes = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            quantity: item.quantity || 1,
            source: "receipt",
          }),
        });

        if (inventoryRes.ok) imported += item.quantity || 1;
      }

      setSuccessCount(imported);
      setStep("done");
    } catch (err) {
      console.error("Import error:", err);
      setError("Blad podczas importu");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setProducts([]);
    setError(null);
    setSuccessCount(0);
    setStep("upload");
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
        <h1 className="text-2xl font-bold">Skan paragonu</h1>
        <p className="text-muted-foreground mt-1">
          Zrob zdjecie lub wgraj skan paragonu
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <Camera className="w-12 h-12 text-muted-foreground" />
                <Upload className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Zrob zdjecie lub wybierz plik</p>
                <p className="text-sm text-muted-foreground">
                  Obslugiwane formaty: JPG, PNG
                </p>
              </div>
            </div>
          </button>

          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Jak to dziala?</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Zrob zdjecie paragonu</li>
              <li>AI odczyta i rozpozna produkty</li>
              <li>Wybierz co dodac do inwentarza</li>
            </ol>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && image && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={image}
              alt="Paragon"
              className="w-full max-h-80 object-contain bg-muted"
            />
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-6 bg-muted rounded-lg text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="font-medium">Przetwarzanie...</p>
              <p className="text-sm text-muted-foreground">OCR + rozpoznawanie produktow</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                Zmien zdjecie
              </button>
              <button
                onClick={handleProcess}
                className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Przetwarzaj
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Select products */}
      {step === "select" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Znaleziono {products.length} produktow. Kliknij aby odznaczyc, lub ikone olowka aby edytowac.
          </p>

          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index}>
                {editingIndex === index ? (
                  // Edit mode
                  <div className="p-4 rounded-lg border border-primary bg-primary/5 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Nazwa</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
                        placeholder="Nazwa produktu"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Marka (opcjonalnie)</label>
                        <input
                          type="text"
                          value={editForm.brand}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
                          placeholder="Marka"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Ilosc</label>
                        <input
                          type="number"
                          min="1"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                          className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Kategoria</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={cancelEditing}
                        className="flex-1 py-2 px-3 border rounded-lg text-sm hover:bg-accent transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Anuluj
                      </button>
                      <button
                        onClick={saveEditing}
                        className="flex-1 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Zapisz
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div
                    onClick={() => toggleProduct(index)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      product.selected
                        ? "bg-primary/5 border-primary"
                        : "bg-card opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        {product.selected ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {product.name}
                          {product.quantity > 1 && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              x{product.quantity}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {product.category}
                          {product.brand && ` • ${product.brand}`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(index);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleImport}
              disabled={loading || products.filter((p) => p.selected).length === 0 || editingIndex !== null}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Importowanie..."
                : `Dodaj (${products.filter((p) => p.selected).reduce((sum, p) => sum + p.quantity, 0)})`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="p-6 bg-primary/10 text-primary rounded-lg text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Sukces!</h2>
            <p>Dodano {successCount} produktow z paragonu</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Skanuj kolejny
            </button>
            <Link
              href="/inventory"
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
            >
              Zobacz inwentarz
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

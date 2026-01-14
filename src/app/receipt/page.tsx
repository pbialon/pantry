"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface CategorizedItem {
  original: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: string | null;
  quantity_unit: string | null;
  selected: boolean;
}

type Step = "upload" | "ocr" | "categorize" | "done";

export default function ReceiptPage() {
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [items, setItems] = useState<CategorizedItem[]>([]);
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
      setRawText(null);
      setProducts([]);
      setItems([]);
      setError(null);
      setStep("ocr");
    };
    reader.readAsDataURL(file);
  };

  const handleOCR = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      // Extract base64 without data URI prefix
      const base64 = image.includes(",") ? image.split(",")[1] : image;
      const fileType = image.match(/data:([^;]+)/)?.[1] || "image/jpeg";

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, fileType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Blad OCR");
      }

      const data = await res.json();
      setRawText(data.rawText);
      setProducts(data.products);

      if (data.products.length === 0) {
        setError("Nie znaleziono produktow na paragonie");
      } else {
        setStep("categorize");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        err instanceof Error ? err.message : "Blad przetwarzania paragonu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCategorize = async () => {
    if (products.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) {
        throw new Error("Blad kategoryzacji");
      }

      const categorized = await res.json();

      const parsed: CategorizedItem[] = products.map((line, index) => {
        const cat = categorized[index] || {};
        return {
          original: line,
          name: cat.name || line,
          brand: cat.brand || null,
          category: cat.category || "Spizarnia",
          quantity: cat.quantity || "1",
          quantity_unit: cat.quantity_unit || "szt",
          selected: true,
        };
      });

      setItems(parsed);
    } catch (err) {
      console.error("Categorization error:", err);
      // Fallback to simple items
      const parsed: CategorizedItem[] = products.map((line) => ({
        original: line,
        name: line,
        brand: null,
        category: "Spizarnia",
        quantity: "1",
        quantity_unit: "szt",
        selected: true,
      }));
      setItems(parsed);
      setError("AI niedostepne - produkty bez kategoryzacji");
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

        if (!productRes.ok) continue;

        const product = await productRes.json();

        const inventoryRes = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            quantity: parseInt(item.quantity || "1") || 1,
            source: "receipt",
          }),
        });

        if (inventoryRes.ok) imported++;
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
    setRawText(null);
    setProducts([]);
    setItems([]);
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
        </div>
      )}

      {/* Step: OCR */}
      {step === "ocr" && image && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={image}
              alt="Paragon"
              className="w-full max-h-96 object-contain bg-muted"
            />
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
              Zmien zdjecie
            </button>
            <button
              onClick={handleOCR}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {loading ? "Przetwarzanie..." : "Odczytaj tekst"}
            </button>
          </div>

          {rawText && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Surowy tekst OCR</h3>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">
                {rawText}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Step: Categorize */}
      {step === "categorize" && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">
                  Znalezione produkty ({products.length})
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {products.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="p-4 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-2">
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
                  onClick={handleCategorize}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {loading ? "Kategoryzowanie..." : "Kategoryzuj AI"}
                </button>
              </div>
            </>
          ) : (
            <>
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
                          {item.quantity &&
                            ` • ${item.quantity}${item.quantity_unit || ""}`}
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
                <div className="p-4 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-2">
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
                  disabled={loading || items.filter((i) => i.selected).length === 0}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Importowanie..."
                    : `Importuj (${items.filter((i) => i.selected).length})`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="p-6 bg-primary/10 text-primary rounded-lg text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Sukces!</h2>
            <p>Zaimportowano {successCount} produktow z paragonu</p>
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

      {/* Info box */}
      {step === "upload" && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Jak to dziala?</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Zrob zdjecie lub wgraj skan paragonu</li>
            <li>System wyekstrahuje tekst (OCR)</li>
            <li>AI rozpozna produkty i kategorie</li>
            <li>Zweryfikuj i dodaj do inwentarza</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            Wymaga: OCR_SPACE_API_KEY i OPENAI_API_KEY
          </p>
        </div>
      )}
    </main>
  );
}

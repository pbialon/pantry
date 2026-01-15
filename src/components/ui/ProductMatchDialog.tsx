"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, Search, Plus, SkipForward } from "lucide-react";
import type { Product } from "@/lib/db/schema";

export type MatchDialogResult =
  | { action: "skip" }
  | { action: "create_new" }
  | { action: "use_existing"; productId: number };

interface ProductMatchDialogProps {
  isOpen: boolean;
  productName: string;
  productBrand?: string;
  similarProducts: Product[];
  onResult: (result: MatchDialogResult) => void;
}

type SelectionType = "create_new" | number;

// Calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]/g, " ").trim();
  const getKeywords = (s: string) => normalize(s).split(/\s+/).filter(w => w.length > 2);

  const keywords1 = getKeywords(str1);
  const keywords2 = getKeywords(str2);

  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  // Count how many keywords from str1 appear in str2
  const matchCount = keywords1.filter(kw =>
    keywords2.some(kw2 => kw2.includes(kw) || kw.includes(kw2))
  ).length;

  return matchCount / Math.max(keywords1.length, keywords2.length);
}

// Find the best matching product (if similarity > threshold)
function findBestMatch(searchName: string, searchBrand: string | undefined, products: Product[]): number | null {
  const SIMILARITY_THRESHOLD = 0.6;

  let bestMatch: { productId: number; score: number } | null = null;

  for (const product of products) {
    // Calculate name similarity
    let score = calculateSimilarity(searchName, product.name);

    // Boost score if brands match
    if (searchBrand && product.brand) {
      const brandSimilarity = calculateSimilarity(searchBrand, product.brand);
      if (brandSimilarity > 0.5) {
        score = Math.min(1, score + 0.2);
      }
    }

    if (score > SIMILARITY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { productId: product.id, score };
    }
  }

  return bestMatch?.productId ?? null;
}

export function ProductMatchDialog({
  isOpen,
  productName,
  productBrand,
  similarProducts,
  onResult,
}: ProductMatchDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionType>("create_new");

  // Calculate best match when dialog opens
  const defaultSelection = useMemo(() => {
    const bestMatchId = findBestMatch(productName, productBrand, similarProducts);
    return bestMatchId ?? "create_new";
  }, [productName, productBrand, similarProducts]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();
      setSelection(defaultSelection);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, defaultSelection]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onResult({ action: "skip" });
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onResult]);

  if (!isOpen) return null;

  const handleSkip = () => {
    onResult({ action: "skip" });
  };

  const handleConfirm = () => {
    if (selection === "create_new") {
      onResult({ action: "create_new" });
    } else {
      onResult({ action: "use_existing", productId: selection });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - clicking backdrop skips the item */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted transition-colors"
          title="Pomin produkt"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>

          {/* Content */}
          <h2 className="text-lg font-semibold text-center mb-2">
            Znaleziono podobne produkty
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Dodajesz: <span className="font-medium text-foreground">{productName}</span>
            {productBrand && <span className="text-muted-foreground"> ({productBrand})</span>}
          </p>

          {/* Options */}
          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
            {/* Similar products */}
            {similarProducts.map((product) => (
              <label
                key={product.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selection === product.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="product-match"
                  value={product.id}
                  checked={selection === product.id}
                  onChange={() => setSelection(product.id)}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  {product.brand && (
                    <p className="text-sm text-muted-foreground">{product.brand}</p>
                  )}
                </div>
              </label>
            ))}

            {/* Create new option */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selection === "create_new"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="product-match"
                value="create_new"
                checked={selection === "create_new"}
                onChange={() => setSelection("create_new")}
                className="w-4 h-4 text-primary"
              />
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Utworz nowy produkt</span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-2.5 px-4 border rounded-lg font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Pomin
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Wybierz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Plus } from "lucide-react";
import type { Product } from "@/lib/db/schema";

interface ProductMatchDialogProps {
  isOpen: boolean;
  productName: string;
  productBrand?: string;
  similarProducts: Product[];
  onSelect: (productId: number | null) => void;
  onCancel: () => void;
}

export function ProductMatchDialog({
  isOpen,
  productName,
  productBrand,
  similarProducts,
  onSelect,
  onCancel,
}: ProductMatchDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();
      setSelectedId(null);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(selectedId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted transition-colors"
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
                  selectedId === product.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="product-match"
                  value={product.id}
                  checked={selectedId === product.id}
                  onChange={() => setSelectedId(product.id)}
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
                selectedId === null
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="product-match"
                value=""
                checked={selectedId === null}
                onChange={() => setSelectedId(null)}
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
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Anuluj
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

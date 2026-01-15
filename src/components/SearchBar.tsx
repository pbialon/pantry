"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Package, ImageOff } from "lucide-react";
import Link from "next/link";
import type { InventoryWithProduct, Product } from "@/lib/db/schema";

interface SearchResults {
  inventory: InventoryWithProduct[];
  products: Product[];
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults(null);
    inputRef.current?.focus();
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
  };

  const hasResults = results && (results.inventory.length > 0 || results.products.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Szukaj produktow..."
          className="w-full pl-10 pr-10 py-2 bg-muted rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Szukam...
            </div>
          ) : hasResults ? (
            <div>
              {/* Inventory results */}
              {results.inventory.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    W inwentarzu ({results.inventory.length})
                  </div>
                  {results.inventory.map((item) => (
                    <Link
                      key={item.id}
                      href="/inventory"
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} szt.
                          {item.category && ` • ${item.category.name}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Products not in inventory */}
              {results.products.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    Znane produkty (nie w inwentarzu)
                  </div>
                  {results.products.map((product) => (
                    <Link
                      key={product.id}
                      href="/scan"
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nie znaleziono produktow
            </div>
          )}
        </div>
      )}
    </div>
  );
}

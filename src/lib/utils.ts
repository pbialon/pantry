import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(daysLeft: number): "expired" | "warning" | "ok" {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "warning";
  return "ok";
}

// Translate quantity units to Polish
export function translateUnit(unit: string, quantity: number = 1): string {
  const translations: Record<string, { one: string; few: string; many: string }> = {
    units: { one: "szt.", few: "szt.", many: "szt." },
    unit: { one: "szt.", few: "szt.", many: "szt." },
    pcs: { one: "szt.", few: "szt.", many: "szt." },
    kg: { one: "kg", few: "kg", many: "kg" },
    g: { one: "g", few: "g", many: "g" },
    l: { one: "l", few: "l", many: "l" },
    ml: { one: "ml", few: "ml", many: "ml" },
    pack: { one: "opak.", few: "opak.", many: "opak." },
    bottle: { one: "but.", few: "but.", many: "but." },
  };

  const normalized = unit.toLowerCase().trim();
  const trans = translations[normalized];

  if (!trans) return unit; // Return original if no translation

  // Polish plural rules
  if (quantity === 1) return trans.one;
  if (quantity >= 2 && quantity <= 4) return trans.few;
  return trans.many;
}

// Translate transaction types to Polish
export function translateTransactionType(type: string): string {
  const translations: Record<string, string> = {
    add: "Dodano",
    remove: "Usunieto",
    adjust: "Skorygowano",
    expire: "Wygaslo",
  };
  return translations[type] || type;
}

// Translate source to Polish
export function translateSource(source: string): string {
  const translations: Record<string, string> = {
    manual: "recznie",
    barcode: "skan kodu",
    receipt: "paragon",
    import: "import",
  };
  return translations[source] || source;
}

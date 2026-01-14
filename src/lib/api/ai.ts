import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface ParsedProduct {
  name: string;
  brand?: string;
  category: string;
  quantity?: string;
  quantity_unit?: string;
}

const CATEGORIES = [
  "Nabial i jajka",
  "Mieso i ryby",
  "Warzywa i owoce",
  "Pieczywo",
  "Spizarnia",
  "Konserwy",
  "Mrozonki",
  "Napoje",
  "Slodycze",
  "Chemia domowa",
  "Inne",
];

const SYSTEM_PROMPT = `Jestes asystentem do kategoryzacji produktow spozywczych.
Dla kazdego produktu zwroc JSON z polami:
- name: generyczna nazwa produktu (bez marki, bez ilosci)
- brand: marka (jesli jest widoczna w nazwie)
- category: jedna z kategorii: ${CATEGORIES.join(", ")}
- quantity: ilosc (np. "1", "500", "2")
- quantity_unit: jednostka (np. "szt", "g", "kg", "ml", "l")

Przyklady:
"Mleko UHT 3.2% Laciate 1L" -> {"name": "Mleko UHT 3.2%", "brand": "Laciate", "category": "Nabial i jajka", "quantity": "1", "quantity_unit": "l"}
"Chleb pszenny 500g" -> {"name": "Chleb pszenny", "category": "Pieczywo", "quantity": "500", "quantity_unit": "g"}
"Fairy plyn do naczyn 900ml" -> {"name": "Plyn do naczyn", "brand": "Fairy", "category": "Chemia domowa", "quantity": "900", "quantity_unit": "ml"}

Odpowiadaj TYLKO w formacie JSON array, bez dodatkowego tekstu.`;

export async function categorizeProducts(
  products: string[]
): Promise<ParsedProduct[]> {
  if (products.length === 0) return [];

  const userPrompt = products.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Skategoryzuj te produkty:\n${userPrompt}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Brak odpowiedzi od AI");
  }

  try {
    const parsed = JSON.parse(content);
    // Handle both array and object with "products" key
    const items = Array.isArray(parsed) ? parsed : parsed.products || [];
    return items as ParsedProduct[];
  } catch {
    throw new Error("Nieprawidlowa odpowiedz AI");
  }
}

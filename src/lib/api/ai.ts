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

const RECEIPT_PARSE_PROMPT = `Jestes ekspertem od parsowania polskich paragonow fiskalnych.

Z tekstu OCR wyodrebnij TYLKO produkty spozywcze/domowe.

IGNORUJ: adresy, NIP, daty, ceny, sumy, PTU, numery kas, kody transakcji.

Dla kazdego produktu zwroc:
- name: czytelna nazwa produktu (np. "Mleko UHT 2%", "Jajka L 10szt", "Chleb pszenny")
- brand: TYLKO jesli to znana marka (Laciate, Danone, Wedel, Tymbark, etc). Jesli nie rozpoznajesz marki - zostaw puste.
- category: DOKLADNIE jedna z ponizszych (bez polskich znakow):
  * "Nabial i jajka" - mleko, jajka, ser, jogurt, maslo, smietana
  * "Mieso i ryby" - mieso, wedliny, ryby
  * "Warzywa i owoce" - owoce, warzywa, ziemniaki
  * "Pieczywo" - chleb, bulki, pieczywo
  * "Spizarnia" - makaron, ryz, maka, cukier, olej, kasza, przyprawy
  * "Napoje" - woda, soki, napoje, kawa, herbata, piwo
  * "Mrozonki" - mrozone produkty
  * "Przekaski" - chipsy, slodycze, czekolada, ciastka
  * "Chemia domowa" - plyn do naczyn, proszek, papier toaletowy

NIE dodawaj marki jesli to tylko fragment tekstu OCR lub kod.

Odpowiedz jako JSON: {"products": [...]}`;


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

export async function parseReceiptWithAI(
  ocrText: string
): Promise<ParsedProduct[]> {
  if (!ocrText.trim()) return [];

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: `Tekst OCR z paragonu:\n\n${ocrText}`,
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
    const items = parsed.products || [];
    return items as ParsedProduct[];
  } catch {
    throw new Error("Nieprawidlowa odpowiedz AI");
  }
}

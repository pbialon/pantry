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
  quantity?: number;
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
  "Przekaski",
  "Przyprawy",
  "Chemia domowa",
  "Inne",
];

const SYSTEM_PROMPT = `Jestes asystentem do kategoryzacji produktow spozywczych.

WAZNE: Wszystko liczymy w SZTUKACH (opakowaniach). Gramatura/pojemnosc jest czescia nazwy produktu.

Dla kazdego produktu zwroc JSON z polami:
- name: pelna nazwa produktu WRAZ z gramatura/pojemnoscia (np. "Mleko UHT 3.2% 1L", "Jajka 10 sztuk", "Maslo 200g")
- brand: marka (jesli jest widoczna w nazwie)
- category: jedna z kategorii: ${CATEGORIES.join(", ")}

Przyklady:
"Mleko UHT 3.2% Laciate 1L" -> {"name": "Mleko UHT 3.2% 1L", "brand": "Laciate", "category": "Nabial i jajka"}
"Jajka L 10 sztuk" -> {"name": "Jajka L 10 sztuk", "category": "Nabial i jajka"}
"Chleb pszenny 500g" -> {"name": "Chleb pszenny 500g", "category": "Pieczywo"}
"Fairy plyn do naczyn 900ml" -> {"name": "Plyn do naczyn 900ml", "brand": "Fairy", "category": "Chemia domowa"}
"Maslo Ekstra 200g" -> {"name": "Maslo Ekstra 200g", "category": "Nabial i jajka"}

Odpowiadaj TYLKO w formacie JSON array, bez dodatkowego tekstu.`;

const RECEIPT_PARSE_PROMPT = `Jestes ekspertem od parsowania polskich paragonow fiskalnych.

WAZNE: Wszystko liczymy w SZTUKACH (opakowaniach). Gramatura/pojemnosc jest czescia nazwy produktu.

Z tekstu OCR wyodrebnij TYLKO produkty spozywcze/domowe.

IGNORUJ: adresy, NIP, daty, ceny, sumy, PTU, numery kas, kody transakcji, numery telefonow.

WAZNE - Nazwy produktow:
- NIE kopiuj skrotow z paragonu (np. "MLK UHT", "JAJKO NIESPODZ", "CUK DR")
- Tworz pelne, czytelne nazwy WRAZ z gramatura (np. "Mleko UHT 2% 1L", "Jajka 10 sztuk")
- Jesli nie wiesz co to za produkt, pomin go
- Jesli widzisz ilosc opakowan (np. "3 szt", "x2", "2*") - zapisz ja w polu quantity

Dla kazdego produktu zwroc:
- name: PELNA, czytelna nazwa produktu z gramatura (NIE skroty z paragonu!)
- brand: TYLKO jesli to znana marka (Laciate, Danone, Wedel, Tymbark, Kinder, Ferrero, Milka, etc). Jesli nie rozpoznajesz marki - zostaw puste.
- category: DOKLADNIE jedna z ponizszych (bez polskich znakow):
  * "Nabial i jajka" - mleko, jajka, ser, jogurt, maslo, smietana
  * "Mieso i ryby" - mieso, wedliny, ryby
  * "Warzywa i owoce" - owoce, warzywa, ziemniaki
  * "Pieczywo" - chleb, bulki, pieczywo
  * "Spizarnia" - makaron, ryz, maka, cukier, olej, kasza
  * "Przyprawy" - przyprawy, sol, pieprz, ziola
  * "Napoje" - woda, soki, napoje, kawa, herbata, piwo
  * "Mrozonki" - mrozone produkty
  * "Przekaski" - chipsy, slodycze, czekolada, ciastka
  * "Chemia domowa" - plyn do naczyn, proszek, papier toaletowy
  * "Inne" - inne produkty
- quantity: ilosc OPAKOWAN (domyslnie 1, jesli sa 3 opakowania mleka = 3)

Przyklady rozpoznawania:
- "MLK UHT LACIATE 2% 1L" -> {"name": "Mleko UHT 2% 1L", "brand": "Laciate", "category": "Nabial i jajka", "quantity": 1}
- "JAJKA L 10SZT" -> {"name": "Jajka L 10 sztuk", "category": "Nabial i jajka", "quantity": 1}
- "CHLEB PSZENNY 500G 2 szt" -> {"name": "Chleb pszenny 500g", "category": "Pieczywo", "quantity": 2}
- "MASLO EKSTRA 200G" -> {"name": "Maslo Ekstra 200g", "category": "Nabial i jajka", "quantity": 1}

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

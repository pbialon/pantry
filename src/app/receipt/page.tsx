"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Upload, FileText } from "lucide-react";

export default function ReceiptPage() {
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setExtractedText(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!image) return;

    setLoading(true);

    // OCR integration will be added in Phase 3
    // For now, show a placeholder
    setTimeout(() => {
      setExtractedText(
        "OCR bedzie dostepne po integracji z OCR.space (Faza 3)\n\n" +
          "Przykładowy wynik:\n" +
          "- Mleko 3.2% - 4.99\n" +
          "- Chleb - 3.49\n" +
          "- Maslo - 7.99"
      );
      setLoading(false);
    }, 1500);
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

      {!image ? (
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
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={image}
              alt="Paragon"
              className="w-full max-h-96 object-contain bg-muted"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setImage(null);
                setExtractedText(null);
              }}
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Zmien zdjecie
            </button>
            <button
              onClick={handleProcess}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Przetwarzanie..." : "Przetworz OCR"}
            </button>
          </div>

          {extractedText && (
            <div className="p-4 bg-card rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Wyekstrahowany tekst</h3>
              </div>
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                {extractedText}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Jak to dziala?</h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Zrob zdjecie lub wgraj skan paragonu</li>
          <li>System wyekstrahuje tekst (OCR)</li>
          <li>AI rozpozna produkty i kategorie</li>
          <li>Zweryfikuj i dodaj do inwentarza</li>
        </ol>
      </div>
    </main>
  );
}

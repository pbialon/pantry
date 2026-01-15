import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SessionProvider } from "@/components/SessionProvider";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Pantry Manager",
  description: "Household food inventory management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pantry",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <SessionProvider>
          <ServiceWorkerRegister />
          <div className="min-h-screen bg-background">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

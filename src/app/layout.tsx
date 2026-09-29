import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { F1DataProvider } from "@/context/F1DataContext";
import { PredictionWizardProvider } from "@/context/PredictionWizardContext";
import { PredictionWizardModal } from "@/components/PredictionWizardModal";
import { FirebaseConfigAlert } from "@/components/FirebaseConfigAlert";

export const metadata: Metadata = {
  title: "GridProde F1 | Predicciones de Fórmula 1",
  description:
    "Compite con tus amigos prediciendo los resultados de cada Gran Premio de Fórmula 1.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GridProde F1",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#15151E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#15151E] text-[#D0D0D2] antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <F1DataProvider>
            <PredictionWizardProvider>
              <FirebaseConfigAlert />
              <div className="flex-1 flex flex-col">{children}</div>
              <PredictionWizardModal />
            </PredictionWizardProvider>
          </F1DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClientProviders } from "@/components/client-providers";
import { ErrorSuppressor } from "@/components/error-suppressor";
import { ThemeProvider } from "@/context/ThemeContext";

// Font import disabled for offline builds - use system fonts
// import { Inter } from "next/font/google";
// const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AnchorView",
  description: "Sistema Completo de Gerenciamento de Pontos de Ancoragem",
  applicationName: "AnchorView",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnchorView",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#6941DE",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          defaultTheme="system"
          storageKey="anchorview-ui-theme"
        >
          <ClientProviders>
            <ErrorSuppressor />
            {children}
            <Toaster />
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}

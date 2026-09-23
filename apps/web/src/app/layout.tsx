import type { Metadata, Viewport } from "next";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Ecolheita",
  description: "Ofertas com desconto, comparadas entre lojas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <Notifications position="bottom-center" />
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </MantineProvider>
      </body>
    </html>
  );
}

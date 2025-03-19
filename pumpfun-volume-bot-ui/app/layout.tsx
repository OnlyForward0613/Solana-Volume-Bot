import "../styles/globals.css";
import { Metadata, Viewport } from "next";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "dark" },
    { media: "(prefers-color-scheme: dark)", color: "dark" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />

      <body
        className="min-h-screen bg-center bg-cover bg-[url('/image/background.png')] font-arial antialiased text-white"
        suppressHydrationWarning
      >
        <Providers>
          <div className="relative flex flex-col h-screen overflow-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

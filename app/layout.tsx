import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FE Sectors Dashboard",
  description:
    "Sector equity dashboard — Financials, Technology & Healthcare funds with live holdings, market data and AI briefings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

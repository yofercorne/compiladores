import type { Metadata } from "next";
import "./globals.css";
import "./parserlab.css";

export const metadata: Metadata = {
  title: "ParserLab Pro",
  description: "Interactive Compiler Parsing Studio"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
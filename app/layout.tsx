import type { Metadata } from "next";
import "./globals.css";
import { DynamicProvider } from "@/components/providers/dynamic-provider";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Bhai.gg - Community Platform",
  description: "A community platform for Bhai Cabal members",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DynamicProvider>
          <Navbar />
          {children}
        </DynamicProvider>
      </body>
    </html>
  );
}

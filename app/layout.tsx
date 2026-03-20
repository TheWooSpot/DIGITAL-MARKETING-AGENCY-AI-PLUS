import type { Metadata } from "next";
import { Archivo, Cormorant_Garamond, DM_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AnyDoor Engine | Socialutely AI Marketing Platform",
  description:
    "Door b1 — URL diagnostic. Discover what's holding your business back with a free digital marketing diagnostic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${cormorant.variable} ${dmMono.variable}`}>
      <body
        className="min-h-screen antialiased text-[#e8eef5]"
        style={{
          backgroundColor: "#07080d",
          fontFamily: "var(--font-archivo), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Any Door Engine | Free Digital Marketing Diagnostic",
  description:
    "Discover what's holding your business back. Enter your website URL for a free 30-second digital marketing diagnostic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f1a] text-[#e8eef5] antialiased">
        {children}
      </body>
    </html>
  );
}

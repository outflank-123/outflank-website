import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Outflank | Premium B2B Corporate Gifting",
  description:
    "Elevate your brand with Outflank's curated corporate gifting catalog. Premium, customizable gifts for enterprises, employee onboarding, and client appreciation.",
  keywords: ["corporate gifting", "B2B gifts", "employee gifts", "branded merchandise", "Outflank"],
  openGraph: {
    title: "Outflank | Premium B2B Corporate Gifting",
    description: "Curated corporate gifts that leave a lasting impression.",
    type: "website",
    siteName: "Outflank",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-[#fbfbfd] text-[#1d1d1f] flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}

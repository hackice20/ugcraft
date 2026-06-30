import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const vcr = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vcr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UGCRAFT — UGC VIDEO GENERATOR",
  description:
    "Turn any product URL into a short-form UGC-style marketing video.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${vcr.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}

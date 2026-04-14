import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const displaySans = Space_Grotesk({
  variable: "--font-display-sans",
  subsets: ["latin"],
});

const displayMono = Space_Mono({
  variable: "--font-display-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sync | Decision Doctor",
  description:
    "A triage-first movie picker that prescribes the right three movies for your current vibe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displaySans.variable} ${displayMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

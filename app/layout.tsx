import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { PrototypeBanner } from "@/components/prototype-banner";
import "./globals.css";

// One family for everything (display and body), modest weights – the layout carries the hierarchy.
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Byggepartner – få en PC som passer", template: "%s · Byggepartner" },
  description:
    "Studentprototype (IS-219, UiA): en pakketilbudsgenerator som setter sammen en komplett og kompatibel PC innenfor budsjettet ditt.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PrototypeBanner />
        {children}
      </body>
    </html>
  );
}

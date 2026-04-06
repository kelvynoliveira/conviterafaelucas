import type { Metadata } from "next";
import { Playfair_Display, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const lato = Lato({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-lato",
});

const greatVibes = Great_Vibes({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Convite de Casamento | Rafaela & Lucas",
  description: "Com grande alegria, convidamos você para celebrar o nosso amor!",
  openGraph: {
    title: "Convite de Casamento | Rafaela & Lucas",
    description: "Com grande alegria, convidamos você para celebrar o nosso amor!",
    images: ["/hero.jpg"],
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body
        className={`${playfair.variable} ${lato.variable} ${greatVibes.variable} antialiased font-sans text-gray-800 bg-stone-50`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Observatório Eleitoral 2026 — 2º turno seção por seção",
  description:
    "Mapa interativo do 2º turno presidencial de 2026 por estado, município e seção, subgrupos (presídios, aldeias, exterior) e análise dos votos após 17h com os logs de todas as urnas do TSE.",
  openGraph: {
    title: "Observatório Eleitoral 2026",
    description: "Quem ganhou onde, quantos votos foram após as 17h e se eles poderiam mudar o resultado. Dados do TSE, seção por seção.",
    type: "website",
    locale: "pt_BR",
  },
};

// Aplica o tema antes da primeira pintura (evita piscar claro→escuro)
const temaInicial = `try{var t=localStorage.getItem("tema");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${serif.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="min-h-screen bg-page text-ink font-sans">
        {children}
      </body>
    </html>
  );
}

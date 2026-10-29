/**
 * Imagem compartilhável (Instagram) de uma seção, município ou estado, desenhada em canvas.
 * Tudo no navegador: o site é estático.
 */

import { formatTime } from "./format";
import {
  deltaBio, num, pct, pctBio, pctBrancoNulo, pctLula, ppSinal, statsSecao, type SecaoRow, type Stats,
} from "./mapa";
import { linkPara } from "./url";

export type Formato = "post" | "story";

export const FORMATOS: Record<Formato, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1350, label: "Post 4:5" },
  story: { w: 1080, h: 1920, label: "Story 9:16" },
};

export interface DadosCartao {
  /** "Seção eleitoral", "Município", "Estado" */
  tipo: string;
  titulo: string;
  linhas: string[];
  s: Stats;
  t1?: { lula: number; flavio: number } | null;
  /** pares rótulo/valor extras (último voto, votos após 17h…) */
  extras?: [string, string][];
  link: string;
  arquivo: string;
}

interface Cores {
  page: string; card: string; soft: string; line: string; ink: string; ink2: string; ink3: string; muted: string;
  lula: string; flavio: string; accent: string; bio: string; bio1: string;
}

function lerCores(): Cores {
  const cs = getComputedStyle(document.documentElement);
  const v = (k: string) => cs.getPropertyValue(k).trim();
  const escuro = document.documentElement.dataset.theme === "dark";
  return {
    page: v("--page"), card: v("--card"), soft: v("--soft-2"), line: v("--line"), ink: v("--ink"), ink2: v("--ink-2"),
    ink3: v("--ink-3"), muted: v("--muted"), lula: v("--lula"), flavio: v("--flavio"), accent: v("--accent"),
    bio: escuro ? "#d946ef" : "#9333ea", bio1: escuro ? "#8b93a1" : "#8b8f97",
  };
}

function fontes() {
  const cs = getComputedStyle(document.documentElement);
  return {
    sans: cs.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif",
    serif: cs.getPropertyValue("--font-serif").trim() || "Georgia, serif",
  };
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/);
  const out: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else {
      out.push(atual);
      atual = p;
    }
  }
  if (atual) out.push(atual);
  if (out.length > maxLinhas) {
    const corte = out.slice(0, maxLinhas);
    let u = corte[maxLinhas - 1];
    while (u.length && ctx.measureText(`${u}…`).width > largura) u = u.slice(0, -1);
    corte[maxLinhas - 1] = `${u.trimEnd()}…`;
    return corte;
  }
  return out;
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, cor: string) {
  if (w <= 0) return;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}

/** Texto numa linha: reduz a fonte até caber (ou até o mínimo, e então corta com reticências). */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, largura: number, peso: string, tam: number, min: number, familia: string) {
  let t = tam;
  ctx.font = `${peso} ${t}px ${familia}`;
  while (t > min && ctx.measureText(texto).width > largura) {
    t -= 2;
    ctx.font = `${peso} ${t}px ${familia}`;
  }
  if (ctx.measureText(texto).width <= largura) return texto;
  let u = texto;
  while (u.length && ctx.measureText(`${u}…`).width > largura) u = u.slice(0, -1);
  return `${u.trimEnd()}…`;
}

/** 8.323.916 → "8,32 mi"; 357.632 → "358 mil"; números pequenos ficam inteiros. */
function qtdCurta(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: n >= 1e8 ? 1 : 2 })} mi`;
  if (n >= 1e5) return `${Math.round(n / 1e3).toLocaleString("pt-BR")} mil`;
  return num(n);
}

interface Bloco {
  h: number;
  desenhar: (y: number) => void;
}

const CARD_H = 1254;

export async function desenharCartao(d: DadosCartao, formato: Formato): Promise<HTMLCanvasElement> {
  const { w: W, h: H } = FORMATOS[formato];
  const c = lerCores();
  const f = fontes();
  await Promise.all([
    document.fonts.load(`700 72px ${f.serif}`),
    document.fonts.load(`600 32px ${f.sans}`),
    document.fonts.load(`400 32px ${f.sans}`),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  const cardX = 48;
  const cardW = W - 2 * cardX;
  const cardY = (H - CARD_H) / 2;
  const X = cardX + 56;
  const LX = cardW - 112;
  const direita = X + LX;

  const texto = (t: string, x: number, y: number, fonte: string, cor: string, alinhar: CanvasTextAlign = "left") => {
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textAlign = alinhar;
    ctx.fillText(t, x, y);
    ctx.textAlign = "left";
  };

  // ---- fundo e moldura ----
  ctx.fillStyle = c.page;
  ctx.fillRect(0, 0, W, H);
  retangulo(ctx, cardX, cardY, cardW, CARD_H, 36, c.card);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, CARD_H, 36);
  ctx.stroke();

  if (formato === "story") {
    const alvo = d.tipo === "Seção eleitoral" ? "esta seção" : d.titulo;
    texto(ajustar(ctx, `Como votou ${alvo}?`, W - 160, "700", 52, 36, f.serif), W / 2, cardY - 84, ctx.font, c.ink, "center");
    texto(d.tipo === "Seção eleitoral" ? "Confira a sua seção no link" : "Estado, cidade e seção no link",
      W / 2, cardY + CARD_H + 108, `400 30px ${f.sans}`, c.ink3, "center");
  }

  const s = d.s;
  const blocos: Bloco[] = [];

  // ---- cabeçalho ----
  blocos.push({
    h: 28,
    desenhar: (y) => {
      texto("OBSERVATÓRIO ELEITORAL 2026", X, y + 26, `600 24px ${f.sans}`, c.accent);
      texto("PRESIDENTE · 2º TURNO", direita, y + 26, `600 24px ${f.sans}`, c.muted, "right");
    },
  });

  // ---- título ----
  const kicker = d.tipo.toLowerCase() === d.titulo.toLowerCase() ? "" : d.tipo.toUpperCase();
  let tamTitulo = 80;
  ctx.font = `700 ${tamTitulo}px ${f.serif}`;
  while (tamTitulo > 54 && quebrar(ctx, d.titulo, LX, 3).length > 2) {
    tamTitulo -= 4;
    ctx.font = `700 ${tamTitulo}px ${f.serif}`;
  }
  const linhasTitulo = quebrar(ctx, d.titulo, LX, 2);
  ctx.font = `400 30px ${f.sans}`;
  const linhasSub = d.linhas.filter(Boolean).flatMap((l) => quebrar(ctx, l, LX, 2)).slice(0, 3);
  const altTitulo = linhasTitulo.length * tamTitulo * 1.08;
  blocos.push({
    h: (kicker ? 44 : 0) + altTitulo + linhasSub.length * 42,
    desenhar: (y) => {
      let yy = y;
      if (kicker) {
        texto(kicker, X, yy + 26, `600 26px ${f.sans}`, c.ink3);
        yy += 44;
      }
      for (const l of linhasTitulo) {
        yy += tamTitulo * 1.08;
        texto(l, X, yy - tamTitulo * 0.2, `700 ${tamTitulo}px ${f.serif}`, c.ink);
      }
      for (const l of linhasSub) {
        yy += 42;
        texto(l, X, yy - 8, `400 30px ${f.sans}`, c.ink3);
      }
    },
  });

  // ---- resultado ----
  const p = pctLula(s);
  const temT1 = !!d.t1 && d.t1.lula + d.t1.flavio > 0;
  blocos.push({
    h: 240 + (temT1 ? 50 : 0),
    desenhar: (y) => {
      texto("Lula", X, y + 30, `600 30px ${f.sans}`, c.ink);
      texto("Flávio Bolsonaro", direita, y + 30, `600 30px ${f.sans}`, c.ink, "right");
      texto(pct(p), X, y + 122, `700 90px ${f.serif}`, c.lula);
      texto(pct(1 - p), direita, y + 122, `700 90px ${f.serif}`, c.flavio, "right");
      texto(`${num(s.lula)} votos`, X, y + 164, `400 26px ${f.sans}`, c.muted);
      texto(`${num(s.flavio)} votos`, direita, y + 164, `400 26px ${f.sans}`, c.muted, "right");
      const by = y + 188;
      const wl = Number.isFinite(p) ? LX * p : LX / 2;
      retangulo(ctx, X, by, Math.max(0, wl - 3), 40, 12, c.lula);
      retangulo(ctx, X + wl + 3, by, Math.max(0, LX - wl - 3), 40, 12, c.flavio);
      ctx.fillStyle = c.ink;
      ctx.fillRect(X + LX / 2 - 2, by - 10, 4, 60);
      if (temT1) {
        const t = d.t1!.lula / (d.t1!.lula + d.t1!.flavio);
        texto(`No 1º turno, entre os dois: Lula ${pct(t)} · Flávio ${pct(1 - t)}`, X, by + 92, `400 26px ${f.sans}`, c.ink3);
      }
    },
  });

  // ---- digital recusada (1º × 2º) ----
  const p1 = pctBio(s, "falha", 1);
  const p2 = pctBio(s, "falha", 2);
  if (Number.isFinite(p1) || Number.isFinite(p2)) {
    const escala = Math.max(Number.isFinite(p1) ? p1 : 0, Number.isFinite(p2) ? p2 : 0, 0.005) * 1.1;
    const t1 = pctBio(s, "total", 1);
    const t2 = pctBio(s, "total", 2);
    const linhas: [string, number, number, number, string][] = [
      ["1º turno", p1, s.fal1, s.hab1, c.bio1],
      ["2º turno", p2, s.fal2, s.hab2, c.bio],
    ];
    blocos.push({
      h: 52 + linhas.length * 84 + 40,
      desenhar: (y) => {
        ctx.fillStyle = c.line;
        ctx.fillRect(X, y, LX, 2);
        texto("Digital recusada pela urna", X, y + 52, `600 32px ${f.sans}`, c.ink);
        const dl = deltaBio(s, "falha");
        if (Number.isFinite(dl)) texto(ppSinal(dl), direita, y + 52, `600 28px ${f.sans}`, c.ink2, "right");
        let yy = y + 52;
        for (const [rot, v, n, tot, cor] of linhas) {
          yy += 52;
          texto(rot, X, yy, `400 28px ${f.sans}`, c.ink3);
          if (Number.isFinite(v)) {
            const detalhe = `  ·  ${qtdCurta(n)} de ${qtdCurta(tot)}`;
            ctx.font = `400 26px ${f.sans}`;
            const wDet = ctx.measureText(detalhe).width;
            texto(detalhe, direita, yy, ctx.font, c.muted, "right");
            texto(pct(v), direita - wDet, yy, `700 32px ${f.sans}`, c.ink, "right");
          } else {
            texto("sem registro no log", direita, yy, `400 26px ${f.sans}`, c.muted, "right");
          }
          retangulo(ctx, X, yy + 14, LX, 16, 8, c.soft);
          if (Number.isFinite(v)) retangulo(ctx, X, yy + 14, Math.max(16, (LX * v) / escala), 16, 8, cor);
          yy += 32;
        }
        texto(ajustar(ctx, `Contando também quem não tem biometria cadastrada: 1º ${pct(t1)} · 2º ${pct(t2)} sem digital`,
          LX, "400", 24, 18, f.sans), X, yy + 34, ctx.font, c.muted);
      },
    });
  }

  // ---- números ----
  const extras = ([["Votantes", num(s.comp)], ["Brancos e nulos", pct(pctBrancoNulo(s))], ...(d.extras ?? [])] as [string, string][])
    .slice(0, 4);
  blocos.push({
    h: 96,
    desenhar: (y) => {
      ctx.fillStyle = c.line;
      ctx.fillRect(X, y, LX, 2);
      const colW = LX / extras.length;
      extras.forEach(([k, v], i) => {
        const x = X + i * colW;
        texto(ajustar(ctx, k, colW - 16, "400", 24, 18, f.sans), x, y + 46, ctx.font, c.muted);
        texto(ajustar(ctx, v, colW - 16, "600", 36, 24, f.sans), x, y + 90, ctx.font, c.ink);
      });
    },
  });

  // ---- distribui o espaço livre entre os blocos; rodapé preso embaixo ----
  const topo = cardY + 56;
  const rodapeH = 76;
  const base = cardY + CARD_H - 52 - rodapeH - 28;
  const ocupado = blocos.reduce((a, b) => a + b.h, 0);
  const gap = Math.min(72, Math.max(24, (base - topo - ocupado) / (blocos.length - 1 || 1)));
  let y = topo;
  for (const b of blocos) {
    b.desenhar(y);
    y += b.h + gap;
  }

  const fy = cardY + CARD_H - 52;
  texto(ajustar(ctx, "Fonte: TSE, boletins e logs de urna. O voto é secreto: números por seção, não por eleitor.", LX, "400", 22, 16, f.sans),
    X, fy - 40, ctx.font, c.muted);
  texto(ajustar(ctx, d.link.replace(/^https?:\/\//, ""), LX, "600", 26, 16, f.sans), X, fy, ctx.font, c.accent);

  return canvas;
}

export function canvasParaArquivo(canvas: HTMLCanvasElement, nome: string): Promise<File> {
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(new File([b], nome, { type: "image/png" })) : erro(new Error("toBlob falhou"))), "image/png")
  );
}

/** Cartão de uma seção (linha do arquivo do município). */
export function cartaoSecao(a: {
  uf: string; cdTse: number; municipio: string; local: string; bairro: string | null; row: SecaoRow;
}): DadosCartao {
  const { row } = a;
  const extras: [string, string][] = [];
  if (row[8] != null) extras.push(["Último voto", formatTime(row[8])]);
  extras.push(["Após 17h", row[7] != null ? num(row[7]) : "—"]);
  return {
    tipo: "Seção eleitoral",
    titulo: `Zona ${row[0]} · Seção ${row[1]}`,
    linhas: [`${a.local}${a.bairro ? ` · ${a.bairro}` : ""}`, `${a.municipio} – ${a.uf}`],
    s: statsSecao(row),
    t1: row[17] != null && row[18] != null ? { lula: row[17], flavio: row[18] } : null,
    extras,
    link: linkPara({ uf: a.uf, mun: a.cdTse, zona: row[0], secao: row[1] }),
    arquivo: `secao-${a.uf}-${a.cdTse}-z${row[0]}-s${row[1]}`.toLowerCase(),
  };
}

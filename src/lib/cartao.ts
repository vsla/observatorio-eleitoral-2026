/**
 * Imagem compartilhável (Instagram) de uma seção, município ou estado, desenhada em canvas.
 * Tudo no navegador: o site é estático.
 */

import { formatTime } from "./format";
import {
  deltaSem, num, pct, pctBrancoNulo, pctLula, pctSem1, pctSem2, ppSinal, statsSecao, type SecaoRow, type Stats,
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
  const M = 72;
  const L = W - 2 * M;

  ctx.fillStyle = c.page;
  ctx.fillRect(0, 0, W, H);
  if (formato === "story") {
    ctx.fillStyle = c.ink;
    ctx.font = `700 46px ${f.serif}`;
    ctx.textAlign = "center";
    const alvo = d.tipo === "Seção eleitoral" ? "esta seção" : d.titulo;
    ctx.fillText(quebrar(ctx, `Como votou ${alvo}?`, W - 2 * M, 1)[0], W / 2, (H - (FORMATOS.post.h - 112)) / 2 - 70);
    ctx.font = `400 28px ${f.sans}`;
    ctx.fillStyle = c.ink3;
    ctx.fillText(d.tipo === "Seção eleitoral" ? "Confira a sua seção no link" : "Veja estado, cidade e seção no link", W / 2, H - (H - (FORMATOS.post.h - 112)) / 2 + 90);
    ctx.textAlign = "left";
  }

  // cartão central
  // mesmo cartão nos dois formatos; no story ele fica centralizado
  const cardH = FORMATOS.post.h - 112;
  const cardY = (H - cardH) / 2;
  retangulo(ctx, M - 24, cardY, L + 48, cardH, 36, c.card);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(M - 24, cardY, L + 48, cardH, 36);
  ctx.stroke();

  const X = M + 24;
  const LX = L - 48;
  let y = cardY + 76;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = c.accent;
  ctx.font = `600 26px ${f.sans}`;
  ctx.fillText("OBSERVATÓRIO ELEITORAL 2026", X, y);
  ctx.fillStyle = c.muted;
  ctx.textAlign = "right";
  ctx.fillText("PRESIDENTE · 2º TURNO", X + LX, y);
  ctx.textAlign = "left";

  y += 64;
  ctx.fillStyle = c.ink3;
  ctx.font = `600 28px ${f.sans}`;
  ctx.fillText(d.tipo.toUpperCase(), X, y);

  y += 72;
  ctx.fillStyle = c.ink;
  ctx.font = `700 68px ${f.serif}`;
  for (const l of quebrar(ctx, d.titulo, LX, 2)) {
    ctx.fillText(l, X, y);
    y += 76;
  }
  y -= 16;
  ctx.fillStyle = c.ink3;
  ctx.font = `400 32px ${f.sans}`;
  for (const linha of d.linhas) {
    for (const l of quebrar(ctx, linha, LX, 2)) {
      y += 44;
      ctx.fillText(l, X, y);
    }
  }

  // ---- resultado ----
  const s = d.s;
  const p = pctLula(s);
  y += 92;
  ctx.font = `700 84px ${f.serif}`;
  ctx.fillStyle = c.lula;
  ctx.fillText(pct(p), X, y);
  ctx.textAlign = "right";
  ctx.fillStyle = c.flavio;
  ctx.fillText(pct(1 - p), X + LX, y);
  ctx.textAlign = "left";
  y += 44;
  ctx.font = `600 30px ${f.sans}`;
  ctx.fillStyle = c.ink;
  ctx.fillText("Lula", X, y);
  ctx.textAlign = "right";
  ctx.fillText("Flávio Bolsonaro", X + LX, y);
  ctx.textAlign = "left";
  y += 38;
  ctx.font = `400 26px ${f.sans}`;
  ctx.fillStyle = c.muted;
  ctx.fillText(`${num(s.lula)} votos`, X, y);
  ctx.textAlign = "right";
  ctx.fillText(`${num(s.flavio)} votos`, X + LX, y);
  ctx.textAlign = "left";

  y += 28;
  const bh = 34;
  const wl = Number.isFinite(p) ? LX * p : LX / 2;
  retangulo(ctx, X, y, Math.max(0, wl - 2), bh, 10, c.lula);
  retangulo(ctx, X + wl + 2, y, Math.max(0, LX - wl - 2), bh, 10, c.flavio);
  ctx.fillStyle = c.ink;
  ctx.fillRect(X + LX / 2 - 1.5, y - 8, 3, bh + 16);
  y += bh;

  if (d.t1 && d.t1.lula + d.t1.flavio > 0) {
    const t = d.t1.lula / (d.t1.lula + d.t1.flavio);
    y += 46;
    ctx.font = `400 28px ${f.sans}`;
    ctx.fillStyle = c.ink3;
    ctx.fillText(`1º turno (entre os dois): Lula ${pct(t)} · Flávio ${pct(1 - t)}`, X, y);
  }

  // ---- biometria ----
  const p1 = pctSem1(s);
  const p2 = pctSem2(s);
  if (Number.isFinite(p1) || Number.isFinite(p2)) {
    y += 78;
    ctx.fillStyle = c.line;
    ctx.fillRect(X, y - 44, LX, 2);
    ctx.fillStyle = c.ink;
    ctx.font = `600 34px ${f.sans}`;
    ctx.fillText("Votaram sem biometria", X, y);
    ctx.textAlign = "right";
    ctx.fillStyle = c.ink2;
    ctx.font = `600 30px ${f.sans}`;
    ctx.fillText(ppSinal(deltaSem(s)), X + LX, y);
    ctx.textAlign = "left";

    const escala = Math.min(1, Math.max(Number.isFinite(p1) ? p1 : 0, Number.isFinite(p2) ? p2 : 0, 0.01) * 1.15);
    const rotW = 150;
    const valW = 300;
    const barW = LX - rotW - valW;
    const linhas: [string, number, number, number, string][] = [
      ["1º turno", p1, s.sem1, s.hab1, c.bio1],
      ["2º turno", p2, s.sem2, s.hab2, c.bio],
    ];
    for (const [rot, v, n, tot, cor] of linhas) {
      y += 62;
      ctx.font = `400 28px ${f.sans}`;
      ctx.fillStyle = c.ink3;
      ctx.fillText(rot, X, y);
      retangulo(ctx, X + rotW, y - 26, barW, 30, 8, c.soft);
      if (Number.isFinite(v)) retangulo(ctx, X + rotW, y - 26, Math.max(10, (barW * v) / escala), 30, 8, cor);
      ctx.textAlign = "right";
      ctx.fillStyle = c.ink;
      ctx.font = `600 30px ${f.sans}`;
      ctx.fillText(Number.isFinite(v) ? `${pct(v)} · ${num(n)} de ${num(tot)}` : "sem log", X + LX, y);
      ctx.textAlign = "left";
    }
  }

  // ---- extras ----
  const extras: [string, string][] = [
    ["Votantes", num(s.comp)],
    ["Brancos e nulos", pct(pctBrancoNulo(s))],
    ...(d.extras ?? []),
  ].slice(0, 4) as [string, string][];
  y += 110;
  const colW = LX / extras.length;
  extras.forEach(([k, v], i) => {
    ctx.font = `400 24px ${f.sans}`;
    ctx.fillStyle = c.muted;
    ctx.fillText(k, X + i * colW, y);
    ctx.font = `600 34px ${f.sans}`;
    ctx.fillStyle = c.ink;
    ctx.fillText(v, X + i * colW, y + 44);
  });

  // ---- rodapé ----
  const fimCard = cardY + cardH;
  ctx.font = `400 22px ${f.sans}`;
  ctx.fillStyle = c.muted;
  ctx.fillText("Fonte: TSE, boletins e logs de urna. O voto é secreto: números por seção.", X, fimCard - 92);
  ctx.font = `600 26px ${f.sans}`;
  ctx.fillStyle = c.accent;
  const link = d.link.replace(/^https?:\/\//, "");
  ctx.fillText(quebrar(ctx, link, LX, 1)[0], X, fimCard - 50);

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

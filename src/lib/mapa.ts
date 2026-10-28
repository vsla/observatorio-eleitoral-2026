/**
 * Dados e escalas do mapa de resultados (2º turno presidente 2026).
 * Arquivos gerados por pipeline/map_data.py em /public/data/mapa.
 */

export const MAPA_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/mapa`;

// Paleta validada (dataviz validate_palette) nos dois temas. Cada tema tem seus próprios passos.
export type Tema = "light" | "dark";

export interface Paleta {
  lula: string;
  flavio: string;
  /** ponto médio da escala divergente */
  neutro: string;
  /** sem dados / fora do filtro */
  vazio: string;
  /** gap de superfície entre polígonos */
  borda: string;
  seqBaixo: string;
  seqAlto: string;
  pos17Alto: string;
}

export const PALETA: Record<Tema, Paleta> = {
  light: {
    lula: "#dc2626", flavio: "#2563eb", neutro: "#e6e4df", vazio: "#ebeae6", borda: "#ffffff",
    seqBaixo: "#f1f0ec", seqAlto: "#0e7490", pos17Alto: "#ca8a04",
  },
  dark: {
    lula: "#ef4444", flavio: "#3b82f6", neutro: "#3a4152", vazio: "#1a1f2b", borda: "#0b0e14",
    seqBaixo: "#1a1f2b", seqAlto: "#38bdf8", pos17Alto: "#f59e0b",
  },
};

/** Cores para CSS (seguem o tema via variáveis). Para cálculos use PALETA[tema]. */
export const COR = {
  lula: "var(--lula)",
  flavio: "var(--flavio)",
  late: "var(--late)",
} as const;

export const NOME = { lula: "Lula", flavio: "Flávio Bolsonaro" } as const;

/** Ordem dos campos de estatística em todos os JSONs do mapa. */
export interface Stats {
  secoes: number;
  aptos: number;
  comp: number;
  lula: number;
  flavio: number;
  bn: number;
  pos17: number;
}

export function toStats(a: number[], offset = 0): Stats {
  return {
    secoes: a[offset],
    aptos: a[offset + 1],
    comp: a[offset + 2],
    lula: a[offset + 3],
    flavio: a[offset + 4],
    bn: a[offset + 5],
    pos17: a[offset + 6],
  };
}

export function somar(list: Stats[]): Stats {
  const s: Stats = { secoes: 0, aptos: 0, comp: 0, lula: 0, flavio: 0, bn: 0, pos17: 0 };
  for (const x of list) {
    s.secoes += x.secoes;
    s.aptos += x.aptos;
    s.comp += x.comp;
    s.lula += x.lula;
    s.flavio += x.flavio;
    s.bn += x.bn;
    s.pos17 += x.pos17;
  }
  return s;
}

export const validos = (s: Stats) => s.lula + s.flavio;
export const pctLula = (s: Stats) => (validos(s) ? s.lula / validos(s) : NaN);
export const margem = (s: Stats) => (validos(s) ? (s.lula - s.flavio) / validos(s) : NaN);
export const pctAbstencao = (s: Stats) => (s.aptos ? 1 - s.comp / s.aptos : NaN);
export const pctBrancoNulo = (s: Stats) => (s.comp ? s.bn / s.comp : NaN);
export const pctPos17 = (s: Stats) => (s.comp ? s.pos17 / s.comp : NaN);
export const vencedor = (s: Stats): "lula" | "flavio" | "empate" | null =>
  validos(s) === 0 ? null : s.lula > s.flavio ? "lula" : s.flavio > s.lula ? "flavio" : "empate";

// ---------- Arquivos ----------

export interface ResumoJson {
  campos: string[];
  brasil: number[];
  regioes: Record<string, number[]>;
  ufs: Record<string, { regiao: string; s: number[] }>;
  subgrupos: Record<string, number[]>;
  subgrupos_uf: (string | number)[][];
  capital_uf: (string | boolean | number)[][];
}

export interface Municipio extends Stats {
  cdTse: number;
  cdIbge: number | null;
  uf: string;
  nome: string;
  capital: boolean;
  t1Lula: number;
  t1Flavio: number;
}

export interface MunicipiosJson {
  cols: string[];
  rows: (number | string | boolean | null)[][];
}

export function parseMunicipios(j: MunicipiosJson): Municipio[] {
  return j.rows.map((r) => ({
    cdTse: r[0] as number,
    cdIbge: r[1] as number | null,
    uf: r[2] as string,
    nome: r[3] as string,
    capital: r[4] as boolean,
    ...toStats(r as number[], 5),
    t1Lula: r[12] as number,
    t1Flavio: r[13] as number,
  }));
}

export interface LocalEspecial extends Stats {
  uf: string;
  cdTse: number;
  municipio: string;
  local: string;
  subgrupo: Subgrupo;
  lat: number | null;
  lon: number | null;
}

export function parseEspeciais(j: MunicipiosJson): LocalEspecial[] {
  return j.rows.map((r) => ({
    uf: r[0] as string,
    cdTse: r[1] as number,
    municipio: r[2] as string,
    local: r[3] as string,
    subgrupo: r[4] as Subgrupo,
    lat: r[5] as number | null,
    lon: r[6] as number | null,
    ...toStats(r as number[], 7),
  }));
}

export interface PerfilJson {
  dims: { id: string; label: string; faixas: [number, number][] }[];
  /** escopo (BR, região, UF) -> dim -> faixas [secoes, eleitores, lula, flavio] */
  escopos: Record<string, Record<string, [number, number, number, number][]>>;
}

export interface MunDetalheJson {
  uf: string;
  cd_tse: number;
  nome: string;
  cols: string[];
  locais: {
    nome: string;
    bairro: string | null;
    subgrupo: Subgrupo;
    lat: number | null;
    lon: number | null;
    secoes: SecaoRow[];
  }[];
}

/**
 * [zona, secao, aptos, comp, lula, flavio, bn, pos17, ultimo_voto, abertura, primeiro_voto,
 *  votos por hora 6h..21h (Brasília), horário de cada voto após 17h]
 * Campos do log são null quando a seção não tem log publicado.
 */
export type SecaoRow = [
  number, number, number, number, number, number, number,
  number | null, number | null, number | null, number | null, number[] | null, number[] | null,
];

// ---------- Geografia ----------

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;

export const UF_IBGE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

export const UF_NOME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais",
  MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia",
  RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins", ZZ: "Exterior",
};

// ---------- Subgrupos ----------

export type Subgrupo =
  | "convencional"
  | "estabelecimento_penal"
  | "internacao_adolescentes"
  | "aldeia_indigena"
  | "quilombo"
  | "voto_em_transito"
  | "exterior";

export const SUBGRUPO_LABEL: Record<Subgrupo, string> = {
  convencional: "Seções comuns",
  estabelecimento_penal: "Presídios (estabelecimentos penais)",
  internacao_adolescentes: "Unidades de internação de adolescentes",
  aldeia_indigena: "Aldeias indígenas",
  quilombo: "Quilombos",
  voto_em_transito: "Voto em trânsito",
  exterior: "Exterior",
};

export const SUBGRUPO_NOTA: Record<Subgrupo, string> = {
  convencional: "Todas as demais seções.",
  estabelecimento_penal: "Seções do TSE marcadas como “Preso provisório” em presídios, cadeias e CDPs. Só votam presos sem condenação definitiva.",
  internacao_adolescentes: "Seções “Preso provisório” em unidades socioeducativas (ex.: Fundação CASA), identificadas pelo nome do local.",
  aldeia_indigena: "Identificadas pelo nome do local de votação (ALDEIA, INDÍGENA). Aproximação: não há marcação oficial.",
  quilombo: "Identificadas pelo nome do local de votação (QUILOMBO). Aproximação: não há marcação oficial.",
  voto_em_transito: "Seções para eleitores fora do domicílio eleitoral (aeroportos, rodoviárias, escolas).",
  exterior: "Brasileiros votando no exterior, por cidade.",
};

// ---------- Camadas e cores ----------

export type Camada = "margem" | "virada" | "abstencao" | "branco_nulo" | "pos17";

export const CAMADAS: { id: Camada; label: string; desc: string }[] = [
  { id: "margem", label: "Vencedor e margem", desc: "Cor = quem venceu; intensidade = margem sobre os votos válidos." },
  { id: "virada", label: "Virada 1º → 2º turno", desc: "Quem liderava entre os dois finalistas no 1º turno vs. quem venceu no 2º." },
  { id: "abstencao", label: "Abstenção", desc: "Eleitores aptos que não compareceram." },
  { id: "branco_nulo", label: "Brancos e nulos", desc: "Brancos + nulos sobre o comparecimento." },
  { id: "pos17", label: "Votos após 17h", desc: "Votos registrados no log da urna após 17h (Brasília), sobre o comparecimento." },
];

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Margem saturada em ±40 p.p. (cobre a grande maioria dos municípios). */
export const MARGEM_MAX = 0.4;

export function corMargem(m: number, p: Paleta = PALETA.light): string {
  if (Number.isNaN(m)) return p.vazio;
  const t = Math.min(Math.abs(m) / MARGEM_MAX, 1);
  return mix(p.neutro, m >= 0 ? p.lula : p.flavio, 0.2 + 0.8 * t);
}

export type Virada = "manteve_lula" | "manteve_flavio" | "virou_lula" | "virou_flavio" | "sem_dado";

export function virada(t1Lula: number, t1Flavio: number, s: Stats): Virada {
  const v = vencedor(s);
  if (!v || v === "empate" || t1Lula === t1Flavio) return "sem_dado";
  const t1 = t1Lula > t1Flavio ? "lula" : "flavio";
  if (t1 === v) return t1 === "lula" ? "manteve_lula" : "manteve_flavio";
  return v === "lula" ? "virou_lula" : "virou_flavio";
}

export function viradaCor(v: Virada, p: Paleta = PALETA.light): string {
  switch (v) {
    case "manteve_lula": return mix(p.neutro, p.lula, 0.35);
    case "manteve_flavio": return mix(p.neutro, p.flavio, 0.35);
    case "virou_lula": return p.lula;
    case "virou_flavio": return p.flavio;
    default: return p.vazio;
  }
}

export const VIRADA_LABEL: Record<Virada, string> = {
  virou_lula: "Virou para Lula",
  virou_flavio: "Virou para Flávio",
  manteve_lula: "Lula nos dois turnos",
  manteve_flavio: "Flávio nos dois turnos",
  sem_dado: "Empate / sem dado",
};

/** Escala sequencial (uma cor) com domínio [lo, hi]. */
export function corSeq(v: number, lo: number, hi: number, alto: string, p: Paleta = PALETA.light): string {
  if (Number.isNaN(v)) return p.vazio;
  return mix(p.seqBaixo, alto, 0.1 + 0.9 * ((v - lo) / (hi - lo || 1)));
}

/** Domínio das escalas sequenciais: percentis 2–98 para não deixar outliers dominarem. */
export function dominio(values: number[]): [number, number] {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return [0, 1];
  return [v[Math.floor(v.length * 0.02)], v[Math.floor(v.length * 0.98)]];
}

export function valorCamada(c: Camada, s: Stats): number {
  switch (c) {
    case "margem":
      return margem(s);
    case "abstencao":
      return pctAbstencao(s);
    case "branco_nulo":
      return pctBrancoNulo(s);
    case "pos17":
      return pctPos17(s);
    default:
      return NaN;
  }
}

// ---------- Formatação ----------

export const pct = (x: number, d = 1) =>
  Number.isFinite(x)
    ? (x * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%"
    : "—";

export const num = (x: number) => x.toLocaleString("pt-BR");

export const pp = (m: number) =>
  Number.isFinite(m)
    ? `${m >= 0 ? "Lula" : "Flávio"} +${(Math.abs(m) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`
    : "—";

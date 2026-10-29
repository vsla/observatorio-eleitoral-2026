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
  /** sem biometria: polo "mais" (sequencial e divergente) */
  bioAlto: string;
  /** sem biometria: polo "menos" da variação 1º → 2º turno */
  bioBaixo: string;
  /** marcador do 1º turno nas comparações de biometria */
  bioT1: string;
}

export const PALETA: Record<Tema, Paleta> = {
  light: {
    lula: "#dc2626", flavio: "#2563eb", neutro: "#e6e4df", vazio: "#ebeae6", borda: "#ffffff",
    seqBaixo: "#f1f0ec", seqAlto: "#0e7490", pos17Alto: "#ca8a04",
    bioAlto: "#9333ea", bioBaixo: "#0891b2", bioT1: "#8b8f97",
  },
  dark: {
    lula: "#ef4444", flavio: "#3b82f6", neutro: "#3a4152", vazio: "#1a1f2b", borda: "#0b0e14",
    seqBaixo: "#1a1f2b", seqAlto: "#38bdf8", pos17Alto: "#f59e0b",
    bioAlto: "#d946ef", bioBaixo: "#0fa89b", bioT1: "#8b93a1",
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
  /** eleitores habilitados no log da urna e quantos sem biometria, por turno */
  hab1: number;
  sem1: number;
  hab2: number;
  sem2: number;
  /** parte de "sem": tinha digital cadastrada e a urna não reconheceu (o número dos boletins de urna) */
  fal1: number;
  fal2: number;
}

const CAMPOS_STATS = [
  "secoes", "aptos", "comp", "lula", "flavio", "bn", "pos17", "hab1", "sem1", "hab2", "sem2", "fal1", "fal2",
] as const;

export const statsVazio = (): Stats =>
  ({ secoes: 0, aptos: 0, comp: 0, lula: 0, flavio: 0, bn: 0, pos17: 0, hab1: 0, sem1: 0, hab2: 0, sem2: 0, fal1: 0, fal2: 0 });

export function toStats(a: number[], offset = 0): Stats {
  const s = statsVazio();
  CAMPOS_STATS.forEach((k, i) => { s[k] = a[offset + i] ?? 0; });
  return s;
}

export function somar(list: Stats[]): Stats {
  const s = statsVazio();
  for (const x of list) for (const k of CAMPOS_STATS) s[k] += x[k];
  return s;
}

/** Uma seção do arquivo do município como Stats. */
export function statsSecao(r: SecaoRow): Stats {
  return {
    secoes: 1, aptos: r[2] ?? 0, comp: r[3] ?? 0, lula: r[4] ?? 0, flavio: r[5] ?? 0, bn: r[6] ?? 0,
    pos17: r[7] ?? 0, hab1: r[13] ?? 0, sem1: r[14] ?? 0, hab2: r[15] ?? 0, sem2: r[16] ?? 0,
    fal1: r[19] ?? 0, fal2: r[20] ?? 0,
  };
}

export const statsSecoes = (sec: SecaoRow[]) => somar(sec.map(statsSecao));

export const validos = (s: Stats) => s.lula + s.flavio;
export const pctLula = (s: Stats) => (validos(s) ? s.lula / validos(s) : NaN);
export const margem = (s: Stats) => (validos(s) ? (s.lula - s.flavio) / validos(s) : NaN);
export const pctAbstencao = (s: Stats) => (s.aptos ? 1 - s.comp / s.aptos : NaN);
export const pctBrancoNulo = (s: Stats) => (s.comp ? s.bn / s.comp : NaN);
export const pctPos17 = (s: Stats) => (s.comp ? s.pos17 / s.comp : NaN);
export const pctSem1 = (s: Stats) => (s.hab1 ? s.sem1 / s.hab1 : NaN);
export const pctSem2 = (s: Stats) => (s.hab2 ? s.sem2 / s.hab2 : NaN);
/** variação da fatia sem biometria do 1º para o 2º turno (fração; ×100 = p.p.) */
export const deltaSem = (s: Stats) => pctSem2(s) - pctSem1(s);

/**
 * Medidas de biometria. "Sem digital" = todo eleitor liberado sem reconhecimento da digital;
 * divide-se em "digital falhou" (tinha cadastro) e "sem cadastro" (a urna nem pede a digital).
 */
export type MedidaBio = "falha" | "sem_cadastro" | "total";

export const MEDIDA_BIO: Record<MedidaBio, { label: string; curto: string; desc: string }> = {
  falha: {
    label: "Digital falhou", curto: "Falhou",
    desc: "Tinha biometria cadastrada, a urna pediu a digital (até 4 tentativas) e não reconheceu; o mesário liberou pelo ano de nascimento. É o número dos boletins de urna citado na imprensa.",
  },
  sem_cadastro: {
    label: "Sem biometria cadastrada", curto: "Sem cadastro",
    desc: "A urna nem pediu a digital: eleitor sem biometria no cadastro (vota com documento com foto). Inclui o exterior, onde não se usa biometria.",
  },
  total: {
    label: "Total sem digital", curto: "Sem digital",
    desc: "Todos os liberados sem reconhecimento da digital: digital falhou + sem biometria cadastrada.",
  },
};

export function qtdBio(s: Stats, m: MedidaBio, turno: 1 | 2): number {
  const sem = turno === 1 ? s.sem1 : s.sem2;
  const fal = turno === 1 ? s.fal1 : s.fal2;
  return m === "falha" ? fal : m === "total" ? sem : Math.max(0, sem - fal);
}

export const pctBio = (s: Stats, m: MedidaBio, turno: 1 | 2) => {
  const hab = turno === 1 ? s.hab1 : s.hab2;
  return hab ? qtdBio(s, m, turno) / hab : NaN;
};

export const deltaBio = (s: Stats, m: MedidaBio) => pctBio(s, m, 2) - pctBio(s, m, 1);
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
    t1Lula: r[5] as number,
    t1Flavio: r[6] as number,
    ...toStats(r as number[], 7),
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
 *  votos por hora 6h..21h (Brasília), horário de cada voto após 17h,
 *  habilitados 1º turno, sem biometria 1º, habilitados 2º, sem biometria 2º, Lula 1º turno, Flávio 1º turno,
 *  digital falhou 1º, digital falhou 2º]
 * Campos do log são null quando a seção não tem log publicado (ou o log não guardou o 1º turno).
 */
export type SecaoRow = [
  number, number, number, number, number, number, number,
  number | null, number | null, number | null, number | null, number[] | null, number[] | null,
  number | null, number | null, number | null, number | null, number | null, number | null,
  number | null, number | null,
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

export type Camada =
  | "margem" | "virada" | "abstencao" | "branco_nulo" | "pos17"
  | "falha1" | "falha2" | "falha_delta" | "sem_bio1" | "sem_bio2" | "sem_bio_delta";

export const CAMADAS: { id: Camada; label: string; desc: string }[] = [
  { id: "margem", label: "Vencedor e margem", desc: "Cor = quem venceu; intensidade = margem sobre os votos válidos." },
  { id: "virada", label: "Virada 1º → 2º turno", desc: "Quem liderava entre os dois finalistas no 1º turno vs. quem venceu no 2º." },
  { id: "abstencao", label: "Abstenção", desc: "Eleitores aptos que não compareceram." },
  { id: "branco_nulo", label: "Brancos e nulos", desc: "Brancos + nulos sobre o comparecimento." },
  { id: "pos17", label: "Votos após 17h", desc: "Votos registrados no log da urna após 17h (Brasília), sobre o comparecimento." },
  { id: "falha2", label: "Digital falhou · 2º turno", desc: "Tinha biometria cadastrada e a urna não reconheceu a digital, sobre os habilitados no log. Mesma escala do 1º turno." },
  { id: "falha1", label: "Digital falhou · 1º turno", desc: "Tinha biometria cadastrada e a urna não reconheceu a digital, sobre os habilitados no log. Mesma escala do 2º turno." },
  { id: "falha_delta", label: "Digital falhou · variação 1º → 2º", desc: "Diferença, em pontos percentuais, da fatia com digital recusada entre o 1º e o 2º turno." },
  { id: "sem_bio2", label: "Total sem digital · 2º turno", desc: "Todos os liberados sem reconhecimento da digital (falha + sem biometria cadastrada), sobre os habilitados no log. Mesma escala do 1º turno." },
  { id: "sem_bio1", label: "Total sem digital · 1º turno", desc: "Todos os liberados sem reconhecimento da digital (falha + sem biometria cadastrada), sobre os habilitados no log. Mesma escala do 2º turno." },
  { id: "sem_bio_delta", label: "Total sem digital · variação 1º → 2º", desc: "Diferença, em pontos percentuais, da fatia sem digital entre o 1º e o 2º turno." },
];

/** Camadas de biometria: medida e turno ("d" = variação). */
export const CAMADA_BIO: Partial<Record<Camada, { m: MedidaBio; t: 1 | 2 | "d"; }>> = {
  falha1: { m: "falha", t: 1 }, falha2: { m: "falha", t: 2 }, falha_delta: { m: "falha", t: "d" },
  sem_bio1: { m: "total", t: 1 }, sem_bio2: { m: "total", t: 2 }, sem_bio_delta: { m: "total", t: "d" },
};

export const camadaBio = (c: Camada) => c in CAMADA_BIO;
const camadaDiv = (c: Camada) => CAMADA_BIO[c]?.t === "d";

/** Camada do 2º turno de uma medida (para abrir o mapa a partir do painel). */
export const camadaDaMedida = (m: MedidaBio): Camada => (m === "falha" ? "falha2" : "sem_bio2");

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

/** Escala divergente para a variação: neutro no zero, saturada em ±max. */
export function corDiv(v: number, max: number, p: Paleta = PALETA.light): string {
  if (Number.isNaN(v)) return p.vazio;
  const t = Math.min(Math.abs(v) / (max || 1), 1);
  return mix(p.neutro, v >= 0 ? p.bioAlto : p.bioBaixo, 0.12 + 0.88 * t);
}

/** Domínio de uma camada sobre um conjunto de unidades (municípios, estados, locais). */
export function dominioCamada(c: Camada, itens: Stats[]): [number, number] {
  if (c === "margem" || c === "virada") return [0, 1];
  const b = CAMADA_BIO[c];
  if (b?.t === "d") {
    const a = itens.map((s) => Math.abs(deltaBio(s, b.m))).filter(Number.isFinite).sort((x, y) => x - y);
    const m = a.length ? a[Math.floor(a.length * 0.98)] : 0;
    return [-(m || 0.01), m || 0.01];
  }
  // 1º e 2º turno na mesma escala, para a comparação visual valer
  if (b) return dominio(itens.flatMap((s) => [pctBio(s, b.m, 1), pctBio(s, b.m, 2)]));
  return dominio(itens.map((s) => valorCamada(c, s)));
}

/** Cor de um valor numa camada não categórica. */
export function corCamada(c: Camada, v: number, dom: [number, number], p: Paleta): string {
  if (camadaDiv(c)) return corDiv(v, dom[1], p);
  const alto = c === "pos17" ? p.pos17Alto : camadaBio(c) ? p.bioAlto : p.seqAlto;
  return corSeq(v, dom[0], dom[1], alto, p);
}

/** Pontos percentuais com sinal: +1,2 p.p. */
export const ppSinal = (d: number, casas = 1) =>
  Number.isFinite(d)
    ? `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })} p.p.`
    : "—";

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
    default: {
      const b = CAMADA_BIO[c];
      if (!b) return NaN;
      return b.t === "d" ? deltaBio(s, b.m) : pctBio(s, b.m, b.t);
    }
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

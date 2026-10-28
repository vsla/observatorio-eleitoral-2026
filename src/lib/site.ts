/**
 * Tipos e utilitários das seções analíticas (arquivos de pipeline/site_data.py
 * em /public/data/site).
 */

export const SITE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/site`;

export interface NacionalJson {
  resultado: {
    lula: number;
    flavio: number;
    brancos: number;
    nulos: number;
    comparecimento: number;
    aptos: number;
    secoes: number;
    diferenca: number;
  };
  tardios: {
    votos: number;
    secoes: number;
    secoes_total: number;
    pct_comparecimento: number;
    pct_diferenca: number;
    municipios: number;
    ultimo_voto_max: number;
    secoes_ate_18h: number;
    secoes_apos_18h: number;
  };
  exterior: { votos_apos_17_local: number; secoes: number };
  gerado_em: string;
}

export interface TimelineJson {
  minuto_inicial: number;
  /** UF -> votos por minuto (Brasília) a partir de minuto_inicial */
  minutos: Record<string, number[]>;
  ultimo_voto: { inicio_h: number; passo_min: number; ufs: Record<string, number[]>; nota: string };
}

export interface RankingJson {
  cols: string[];
  /** [uf, cd_tse, nome, secoes, comp, pos17, secoes_tardias, ultimo, lula, flavio] */
  rows: [string, number, string, number, number, number, number, number, number, number][];
}

export interface Estratificado {
  estratos: number;
  secoes_tardias: number;
  pct_lula_tardias: number;
  pct_lula_normais: number;
  diferenca: number;
  ic95: [number, number];
}

export interface ConsistenciaJson {
  bootstrap: number;
  nota: string;
  escopos: Record<
    string,
    {
      ingenua: { pct_lula_tardias: number; pct_lula_normais: number; secoes_tardias: number };
      mesmo_municipio: Estratificado | null;
      mesmo_local: Estratificado | null;
    }
  >;
}

export interface MetadataJson {
  eleicao: string;
  gerado_em: string;
  cobertura: {
    secoes_principais: number;
    secoes_agregadas: number;
    secoes_com_log: number;
    secoes_sem_log: { uf: string; mun: string; zona: string; secao: string }[];
    votos_log: number;
    comparecimento_secoes_com_log: number;
    secoes_conciliadas: number;
    secoes_nao_conciliadas: {
      uf: string; municipio: string; zona: number; secao: number; log: number; comparecimento: number; origem: string;
    }[];
  };
  fontes: { arquivo: string; url: string; sha256: string | null; bytes: number | null }[];
}

export const REGIAO_UF: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MS: "Centro-Oeste", MT: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

export const UFS_BR = Object.keys(REGIAO_UF).sort();

/** Escopo geográfico comum às seções: "BR", nome de região ou sigla de UF. */
export type Escopo = string;

export function ufsDoEscopo(e: Escopo): string[] {
  if (e === "BR") return UFS_BR;
  if (REGIAO_UF[e]) return [e];
  return UFS_BR.filter((u) => REGIAO_UF[u] === e);
}

/** "17.0575" -> "17:03" */
export function hhmm(h: number): string {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function hhmmss(h: number): string {
  const t = Math.round(h * 3600);
  const s = (n: number) => String(n).padStart(2, "0");
  return `${s(Math.floor(t / 3600))}:${s(Math.floor((t % 3600) / 60))}:${s(t % 60)}`;
}

// ---------- Ligação entre seções ----------

export interface AbrirSecao {
  uf: string;
  cdTse: number;
  zona?: number;
  secao?: number;
}

const EVENTO = "observatorio:confira";

/** Abre um município/seção na seção "Confira você mesmo" e rola até ela. */
export function abrirNoConfira(alvo: AbrirSecao) {
  window.dispatchEvent(new CustomEvent<AbrirSecao>(EVENTO, { detail: alvo }));
  document.getElementById("confira")?.scrollIntoView({ behavior: "smooth" });
}

export function ouvirConfira(fn: (a: AbrirSecao) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<AbrirSecao>).detail);
  window.addEventListener(EVENTO, h);
  return () => window.removeEventListener(EVENTO, h);
}

/** Endereço do índice dos arquivos da seção no Portal Resultados do TSE. */
export function urlTseSecao(uf: string, cdTse: number, zona: number, secao: number): string {
  const u = uf.toLowerCase();
  const m = String(cdTse).padStart(5, "0");
  const z = String(zona).padStart(4, "0");
  const s = String(secao).padStart(4, "0");
  return `https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados/${u}/${m}/${z}/${s}/p003221-${u}-m${m}-z${z}-s${s}-aux.json`;
}

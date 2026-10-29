/**
 * Estado do painel na URL (?uf=PE&m=25313&z=3&s=793&c=sem_bio2), para compartilhar a vista atual.
 */

import { CAMADAS, type Camada } from "./mapa";

export interface EstadoUrl {
  regiao?: string | null;
  uf?: string | null;
  /** código TSE do município */
  mun?: number | null;
  zona?: number | null;
  secao?: number | null;
  camada?: Camada | null;
}

const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

export function lerUrl(): EstadoUrl {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const c = q.get("c");
  return {
    regiao: q.get("r"),
    uf: q.get("uf")?.toUpperCase() ?? null,
    mun: int(q.get("m")),
    zona: int(q.get("z")),
    secao: int(q.get("s")),
    camada: CAMADAS.some((x) => x.id === c) ? (c as Camada) : null,
  };
}

function query(e: EstadoUrl): string {
  const q = new URLSearchParams();
  if (e.regiao && !e.uf) q.set("r", e.regiao);
  if (e.uf) q.set("uf", e.uf);
  if (e.mun != null) q.set("m", String(e.mun));
  if (e.zona != null && e.secao != null) {
    q.set("z", String(e.zona));
    q.set("s", String(e.secao));
  }
  if (e.camada && e.camada !== "margem") q.set("c", e.camada);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Link absoluto para um estado do painel. */
export function linkPara(e: EstadoUrl): string {
  return `${window.location.origin}${window.location.pathname}${query(e)}`;
}

/** Atualiza a barra de endereço sem recarregar nem criar entrada no histórico. */
export function escreverUrl(e: EstadoUrl) {
  const alvo = `${window.location.pathname}${query(e)}${window.location.hash}`;
  if (alvo !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", alvo);
  }
}

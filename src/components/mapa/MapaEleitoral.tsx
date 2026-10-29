"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, {
  type ExpressionSpecification, type GeoJSONSource, type LngLatBoundsLike, type Map as MLMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, Point, Position } from "geojson";
import { Locate, Minus, Plus } from "lucide-react";
import { useJsonData } from "@/hooks/useJsonData";
import { useTema } from "@/hooks/useTema";
import {
  MAPA_BASE, NOME, PALETA, UF_IBGE, UF_NOME,
  camadaBio, corCamada, corMargem, deltaSem, dominioCamada, margem, num, pct, pctLula, pctSem1, pctSem2, pp, ppSinal,
  statsSecoes, toStats, valorCamada, vencedor, virada, viradaCor,
  type Camada, type LocalEspecial, type Municipio, type MunDetalheJson, type Paleta, type ResumoJson,
  type Stats, type Tema,
} from "@/lib/mapa";

export interface MapScope {
  regiao: string | null;
  uf: string | null;
}

export type NivelCor = "municipios" | "estados";

interface Props {
  municipios: Municipio[];
  resumo: ResumoJson;
  regiaoDaUf: Record<string, string>;
  scope: MapScope;
  camada: Camada;
  nivel: NivelCor;
  /** municípios fora do filtro ficam apagados (mas continuam no mapa) */
  passaFiltro: (m: Municipio) => boolean;
  /** muda quando o filtro muda (passaFiltro é recriada a cada render) */
  filtroKey: string;
  selecionado: Municipio | null;
  detalhe: MunDetalheJson | null;
  pontos: LocalEspecial[];
  onUf: (uf: string) => void;
  onMunicipio: (m: Municipio) => void;
  onLocal?: (indice: number) => void;
  onBrasil: () => void;
}

const ESTILO = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

const BR_BOUNDS: LngLatBoundsLike = [[-74.0, -33.8], [-34.8, 5.3]];
/** Fernando de Noronha: fica fora do enquadramento de PE, senão o estado encolhe. */
const NORONHA = "2605459";
const FONTE = ["Montserrat SemiBold", "Open Sans Bold", "Noto Sans Regular"];

type Bbox = [[number, number], [number, number]];
type MunProps = { cd: string; uf: string };

interface TipData {
  titulo: string;
  sub?: string;
  s: Stats;
  t1?: { lula: number; flavio: number };
  nota?: string;
}

// ---------- geometria ----------

function cadaPosicao(g: Geometry, fn: (p: Position) => void) {
  if (g.type === "Polygon") g.coordinates.forEach((r) => r.forEach(fn));
  else if (g.type === "MultiPolygon") g.coordinates.forEach((pl) => pl.forEach((r) => r.forEach(fn)));
}

function bboxDe(fs: Feature[]): Bbox | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of fs) {
    if (!f.geometry) continue;
    cadaPosicao(f.geometry, ([x, y]) => {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    });
  }
  return Number.isFinite(x0) ? [[x0, y0], [x1, y1]] : null;
}

/** Centroide do maior anel (bom o bastante para posicionar o rótulo do estado). */
function centroRotulo(g: Geometry): [number, number] {
  const aneis: Position[][] = g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : [];
  let melhor: [number, number] = [0, 0];
  let maiorArea = 0;
  for (const r of aneis) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const k = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      a += k;
      cx += (r[j][0] + r[i][0]) * k;
      cy += (r[j][1] + r[i][1]) * k;
    }
    if (Math.abs(a) > maiorArea && a !== 0) {
      maiorArea = Math.abs(a);
      melhor = [cx / (3 * a), cy / (3 * a)];
    }
  }
  return melhor;
}

const FC_VAZIA: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Fontes e camadas próprias. Roda a cada carga de estilo (inclusive troca de tema). */
function montarCamadas(m: MLMap, tema: Tema) {
  const p = PALETA[tema];
  const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
  const opacidade = (cheia: number, apagada: number): ExpressionSpecification =>
    ["case", ["boolean", ["get", "sel"], false], 0.08, ["boolean", ["get", "dim"], false], apagada, cheia];

  m.addSource("mun-br", { type: "geojson", data: FC_VAZIA, promoteId: "cd" });
  m.addSource("mun-hd", { type: "geojson", data: FC_VAZIA, promoteId: "cd" });
  m.addSource("uf", { type: "geojson", data: FC_VAZIA, promoteId: "uf" });
  m.addSource("rotulos", { type: "geojson", data: FC_VAZIA });
  m.addSource("pontos", { type: "geojson", data: FC_VAZIA });
  m.addSource("locais", { type: "geojson", data: FC_VAZIA });

  m.addLayer({
    id: "mun-br-fill", type: "fill", source: "mun-br",
    paint: {
      "fill-color": ["get", "c"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, opacidade(0.95, 0.28), 9, opacidade(0.7, 0.2), 12, opacidade(0.35, 0.1)],
    },
  }, antes);
  m.addLayer({
    id: "mun-br-line", type: "line", source: "mun-br",
    paint: { "line-color": p.borda, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.1, 6, 0.4, 9, 0.8], "line-opacity": 0.7 },
  }, antes);
  m.addLayer({
    id: "mun-hd-fill", type: "fill", source: "mun-hd",
    paint: {
      "fill-color": ["get", "c"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, opacidade(0.95, 0.3), 9, opacidade(0.75, 0.2), 12, opacidade(0.3, 0.1), 15, opacidade(0.15, 0.05)],
    },
  }, antes);
  m.addLayer({
    id: "mun-hd-line", type: "line", source: "mun-hd",
    paint: {
      "line-color": ["case", ["boolean", ["feature-state", "hover"], false], tema === "dark" ? "#f2f3f5" : "#121417", p.borda],
      "line-width": ["interpolate", ["linear"], ["zoom"],
      5, ["case", ["boolean", ["feature-state", "hover"], false], 2, 0.4],
      10, ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 1]],
    },
  }, antes);
  m.addLayer({
    id: "uf-line", type: "line", source: "uf",
    paint: { "line-color": tema === "dark" ? "#a0a6b1" : "#5a5f68", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 7, 1.4], "line-opacity": 0.8 },
  }, antes);
  m.addLayer({
    id: "uf-hover", type: "line", source: "uf",
    paint: {
      "line-color": tema === "dark" ? "#f2f3f5" : "#121417",
      "line-width": 2.5,
      "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
    },
  }, antes);
  m.addLayer({
    id: "uf-sel", type: "line", source: "uf", filter: ["==", ["get", "uf"], ""],
    paint: { "line-color": tema === "dark" ? "#f2f3f5" : "#121417", "line-width": 2 },
  }, antes);
  m.addLayer({
    id: "mun-sel", type: "line", source: "mun-hd", filter: ["==", ["get", "cd"], ""],
    paint: { "line-color": tema === "dark" ? "#f2f3f5" : "#121417", "line-width": 2.5 },
  });
  m.addLayer({
    id: "pontos", type: "circle", source: "pontos",
    paint: {
      "circle-color": ["get", "c"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 6, 12, 9],
      "circle-stroke-color": tema === "dark" ? "#f2f3f5" : "#121417",
      "circle-stroke-width": 1.2,
    },
  });
  m.addLayer({
    id: "locais", type: "circle", source: "locais",
    paint: {
      "circle-color": ["get", "c"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"],
        8, ["+", 2, ["*", 4, ["get", "r"]]],
        12, ["+", 4, ["*", 10, ["get", "r"]]],
        16, ["+", 7, ["*", 18, ["get", "r"]]]],
      "circle-stroke-color": ["case", [">", ["get", "pos17"], 0], p.pos17Alto, p.borda],
      "circle-stroke-width": ["case", [">", ["get", "pos17"], 0], 2, 1.2],
      "circle-opacity": 0.95,
    },
  });
  m.addLayer({
    id: "rotulos", type: "symbol", source: "rotulos",
    layout: {
      "text-field": ["format", ["get", "uf"], { "font-scale": 0.95 }, " ", {}, ["get", "pct"], { "text-color": ["get", "c"] }],
      "text-font": FONTE,
      "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 6, 13],
      "text-allow-overlap": false,
      "text-padding": 1,
    },
    paint: {
      "text-color": tema === "dark" ? "#f2f3f5" : "#121417",
      "text-halo-color": tema === "dark" ? "#0b0e14" : "#ffffff",
      "text-halo-width": 1.6,
    },
  });
}


export function MapaEleitoral(props: Props) {
  const {
    municipios, resumo, regiaoDaUf, scope, camada, nivel, passaFiltro, filtroKey, selecionado, detalhe, pontos,
  } = props;
  const tema = useTema();
  const paleta = PALETA[tema];

  const { data: topoMun } = useJsonData<Topology>(`${MAPA_BASE}/geo/municipios.topojson`);
  const { data: topoUf } = useJsonData<Topology>(`${MAPA_BASE}/geo/ufs.topojson`);
  const { data: topoUfHd } = useJsonData<Topology>(scope.uf ? `${MAPA_BASE}/geo/uf/${scope.uf}.topojson` : null);

  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MLMap | null>(null);
  const [estiloPronto, setEstiloPronto] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; largura: number; d: TipData } | null>(null);

  // ---------- dados derivados ----------

  const porIbge = useMemo(() => {
    const m = new Map<string, Municipio>();
    for (const x of municipios) if (x.cdIbge) m.set(String(x.cdIbge), x);
    return m;
  }, [municipios]);

  const ufT1 = useMemo(() => {
    const m: Record<string, { lula: number; flavio: number }> = {};
    for (const x of municipios) {
      const a = (m[x.uf] ??= { lula: 0, flavio: 0 });
      a.lula += x.t1Lula;
      a.flavio += x.t1Flavio;
    }
    return m;
  }, [municipios]);

  const ufStats = useMemo(() => {
    const m: Record<string, Stats> = {};
    for (const [uf, v] of Object.entries(resumo.ufs)) m[uf] = toStats(v.s);
    return m;
  }, [resumo]);

  const munBase = useMemo(() => {
    if (!topoMun) return [] as Feature<Geometry, MunProps>[];
    const fc = feature(topoMun, topoMun.objects.BRMU as GeometryCollection) as unknown as FeatureCollection<Geometry, { codarea: string }>;
    return fc.features.map((f) => ({ ...f, properties: { cd: f.properties.codarea, uf: UF_IBGE[f.properties.codarea.slice(0, 2)] } }));
  }, [topoMun]);

  const ufBase = useMemo(() => {
    if (!topoUf) return [] as Feature<Geometry, { uf: string }>[];
    const fc = feature(topoUf, topoUf.objects.BRUF as GeometryCollection) as unknown as FeatureCollection<Geometry, { codarea: string }>;
    return fc.features.map((f) => ({ ...f, properties: { uf: UF_IBGE[f.properties.codarea] } }));
  }, [topoUf]);

  const munHd = useMemo(() => {
    if (!topoUfHd || !scope.uf) return [] as Feature<Geometry, MunProps>[];
    const chave = Object.keys(topoUfHd.objects)[0];
    const fc = feature(topoUfHd, topoUfHd.objects[chave] as GeometryCollection) as unknown as FeatureCollection<Geometry, { codarea: string }>;
    const uf = UF_IBGE[fc.features[0]?.properties.codarea.slice(0, 2) ?? ""];
    // a requisição da UF anterior pode chegar depois da troca
    if (uf !== scope.uf) return [];
    return fc.features.map((f) => ({ ...f, properties: { cd: f.properties.codarea, uf } }));
  }, [topoUfHd, scope.uf]);

  const noEscopo = (uf: string) => (scope.uf ? uf === scope.uf : scope.regiao ? regiaoDaUf[uf] === scope.regiao : true);

  const dom = useMemo<[number, number]>(() => {
    if (nivel === "estados") return dominioCamada(camada, Object.entries(ufStats).filter(([u]) => u !== "ZZ").map(([, s]) => s));
    return dominioCamada(camada, municipios.filter((m) => m.uf !== "ZZ" && passaFiltro(m) && noEscopo(m.uf)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipios, camada, nivel, filtroKey, scope.uf, scope.regiao, ufStats]);

  function cor(s: Stats | undefined, t1: { lula: number; flavio: number } | undefined, p: Paleta): string {
    if (!s) return p.vazio;
    if (camada === "margem") return corMargem(margem(s), p);
    if (camada === "virada") return viradaCor(virada(t1?.lula ?? 0, t1?.flavio ?? 0, s), p);
    return corCamada(camada, valorCamada(camada, s), dom, p);
  }

  const fcMunBr = useMemo<FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: munBase.map((f) => {
      const m = porIbge.get(f.properties.cd);
      const s = nivel === "estados" ? ufStats[f.properties.uf] : m;
      const t1 = nivel === "estados" ? ufT1[f.properties.uf] : m ? { lula: m.t1Lula, flavio: m.t1Flavio } : undefined;
      const fora = !noEscopo(f.properties.uf) || (nivel === "municipios" && (!m || !passaFiltro(m)));
      return { ...f, properties: { ...f.properties, c: cor(s, t1, paleta), dim: fora } };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [munBase, porIbge, nivel, ufStats, ufT1, camada, dom, paleta, filtroKey, scope.uf, scope.regiao]);

  const fcMunHd = useMemo<FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: munHd.map((f) => {
      const m = porIbge.get(f.properties.cd);
      return {
        ...f,
        properties: {
          ...f.properties,
          c: cor(m, m ? { lula: m.t1Lula, flavio: m.t1Flavio } : undefined, paleta),
          dim: !m || !passaFiltro(m),
          sel: !!selecionado?.cdIbge && f.properties.cd === String(selecionado.cdIbge),
        },
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [munHd, porIbge, camada, dom, paleta, filtroKey, selecionado]);

  const fcUf = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: ufBase }), [ufBase]);

  const fcRotulos = useMemo<FeatureCollection<Point>>(() => ({
    type: "FeatureCollection",
    features: ufBase
      .filter((f) => noEscopo(f.properties.uf))
      .map((f) => {
        const s = ufStats[f.properties.uf];
        const v = s ? vencedor(s) : null;
        const p = s ? (v === "flavio" ? 1 - pctLula(s) : pctLula(s)) : NaN;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: centroRotulo(f.geometry) },
          properties: {
            uf: f.properties.uf,
            pct: Number.isFinite(p) ? `${Math.round(p * 100)}%` : "",
            c: v === "flavio" ? paleta.flavio : paleta.lula,
          },
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ufBase, ufStats, paleta, scope.regiao, scope.uf]);

  const locais = useMemo(() => {
    if (!detalhe || !selecionado || detalhe.cd_tse !== selecionado.cdTse) return [];
    return detalhe.locais
      .map((l, i) => ({ l, i, s: statsSecoes(l.secoes) }))
      .filter((x) => x.l.lat != null && x.l.lon != null);
  }, [detalhe, selecionado]);

  const fcLocais = useMemo<FeatureCollection<Point>>(() => {
    const max = Math.max(1, ...locais.map((x) => x.s.comp));
    // camadas de biometria colorem os locais também; as demais mostram o resultado
    const bio = camadaBio(camada);
    const domLocais = bio ? dominioCamada(camada, locais.map((x) => x.s)) : dom;
    const corLocal = (s: Stats) => (bio ? corCamada(camada, valorCamada(camada, s), domLocais, paleta) : corMargem(margem(s), paleta));
    return {
      type: "FeatureCollection",
      features: locais.map((x) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [x.l.lon as number, x.l.lat as number] },
        properties: { i: x.i, r: Math.sqrt(x.s.comp / max), c: corLocal(x.s), pos17: bio ? 0 : x.s.pos17 },
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locais, paleta, camada]);

  const fcPontos = useMemo<FeatureCollection<Point>>(() => ({
    type: "FeatureCollection",
    features: pontos
      .filter((p) => p.lat != null && p.lon != null && noEscopo(p.uf))
      .map((p, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lon as number, p.lat as number] },
        properties: { i, c: corMargem(margem(p), paleta) },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pontos, paleta, scope.uf, scope.regiao]);
  const pontosVis = useMemo(() => pontos.filter((p) => p.lat != null && p.lon != null && noEscopo(p.uf)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pontos, scope.uf, scope.regiao]);

  // Estado mais recente para os handlers do mapa (registrados uma vez só)
  const atual = useRef({ props, porIbge, ufStats, ufT1, locais, pontosVis });
  useEffect(() => {
    atual.current = { props, porIbge, ufStats, ufT1, locais, pontosVis };
  });

  // ---------- criação do mapa ----------

  useEffect(() => {
    if (!caixa.current) return;
    const toque = window.matchMedia("(pointer: coarse)").matches;
    const m = new maplibregl.Map({
      container: caixa.current,
      style: ESTILO[document.documentElement.dataset.theme === "dark" ? "dark" : "light"],
      bounds: BR_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      minZoom: 2.5,
      maxZoom: 17,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: toque,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para dar zoom",
        "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para dar zoom",
        "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
      },
    });
    m.touchZoomRotate.disableRotation();
    m.on("style.load", () => {
      montarCamadas(m, document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      setEstiloPronto((n) => n + 1);
    });
    mapa.current = m;

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(caixa.current);

    // ----- interação -----
    let hoverUf: string | null = null;
    let hoverMun: string | null = null;
    const limparHover = () => {
      if (hoverUf && m.getSource("uf")) m.setFeatureState({ source: "uf", id: hoverUf }, { hover: false });
      if (hoverMun && m.getSource("mun-hd")) m.setFeatureState({ source: "mun-hd", id: hoverMun }, { hover: false });
      hoverUf = null;
      hoverMun = null;
    };
    const mostrar = (e: MapLayerMouseEvent, d: TipData) => {
      setTip({ x: e.point.x, y: e.point.y, largura: m.getContainer().clientWidth, d });
    };

    m.on("mousemove", (e) => {
      const { props: p, porIbge: pi, ufStats: us, ufT1: ut, locais: ls, pontosVis: pv } = atual.current;
      const camadas = ["locais", "pontos", "mun-hd-fill", "mun-br-fill"].filter((id) => m.getLayer(id));
      const f = m.queryRenderedFeatures(e.point, { layers: camadas })[0];
      limparHover();
      if (!f) {
        setTip(null);
        m.getCanvas().style.cursor = "";
        return;
      }
      m.getCanvas().style.cursor = "pointer";
      const ev = e as unknown as MapLayerMouseEvent;
      if (f.layer.id === "locais") {
        const x = ls.find((l) => l.i === f.properties.i);
        if (x) mostrar(ev, {
          titulo: x.l.nome,
          sub: `${x.l.bairro ? `${x.l.bairro} · ` : ""}${x.s.secoes} seç${x.s.secoes > 1 ? "ões" : "ão"}`,
          s: x.s,
          nota: x.s.pos17 ? `${num(x.s.pos17)} voto${x.s.pos17 > 1 ? "s" : ""} após 17h` : undefined,
        });
        return;
      }
      if (f.layer.id === "pontos") {
        const x = pv[f.properties.i as number];
        if (x) mostrar(ev, { titulo: x.local, sub: `${x.municipio} (${x.uf})`, s: x });
        return;
      }
      const cd = f.properties.cd as string;
      const uf = f.properties.uf as string;
      const mun = pi.get(cd);
      if (f.layer.id === "mun-hd-fill" || (p.scope.uf && uf === p.scope.uf)) {
        hoverMun = cd;
        if (m.getSource("mun-hd")) m.setFeatureState({ source: "mun-hd", id: cd }, { hover: true });
        if (mun) mostrar(ev, { titulo: mun.nome, sub: UF_NOME[mun.uf], s: mun, t1: { lula: mun.t1Lula, flavio: mun.t1Flavio } });
        return;
      }
      // fora da UF selecionada (ou no nível Brasil/região): o estado é a unidade clicável
      hoverUf = uf;
      m.setFeatureState({ source: "uf", id: uf }, { hover: true });
      const s = us[uf];
      if (s) mostrar(ev, {
        titulo: UF_NOME[uf],
        sub: mun ? `Clique para entrar · ${mun.nome}: ${pp(margem(mun))}` : "Clique para entrar",
        s,
        t1: ut[uf],
      });
    });
    m.on("mouseout", () => {
      limparHover();
      setTip(null);
    });
    m.on("click", (e) => {
      const { props: p, porIbge: pi } = atual.current;
      const camadas = ["locais", "mun-hd-fill", "mun-br-fill"].filter((id) => m.getLayer(id));
      const f = m.queryRenderedFeatures(e.point, { layers: camadas })[0];
      if (!f) return;
      if (f.layer.id !== "locais") setTip(null);
      if (f.layer.id === "locais") {
        p.onLocal?.(f.properties.i as number);
        return;
      }
      const uf = f.properties.uf as string;
      if (f.layer.id === "mun-hd-fill" || (p.scope.uf && uf === p.scope.uf)) {
        const mun = pi.get(f.properties.cd as string);
        if (mun) p.onMunicipio(mun);
        return;
      }
      p.onUf(uf);
    });

    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Troca de tema = troca do mapa base (as camadas próprias são recriadas no style.load)
  const temaAplicado = useRef(tema);
  useEffect(() => {
    const m = mapa.current;
    if (!m || temaAplicado.current === tema) return;
    temaAplicado.current = tema;
    m.setStyle(ESTILO[tema]);
  }, [tema]);

  // Dados nas fontes
  useEffect(() => {
    const m = mapa.current;
    if (!m || !m.getSource("mun-br")) return;
    (m.getSource("mun-br") as GeoJSONSource).setData(fcMunBr);
    (m.getSource("mun-hd") as GeoJSONSource).setData(fcMunHd);
    (m.getSource("uf") as GeoJSONSource).setData(fcUf);
    (m.getSource("rotulos") as GeoJSONSource).setData(scope.uf ? FC_VAZIA : fcRotulos);
    (m.getSource("locais") as GeoJSONSource).setData(fcLocais);
    (m.getSource("pontos") as GeoJSONSource).setData(selecionado ? FC_VAZIA : fcPontos);
    // a malha simplificada some dentro da UF quando a malha detalhada chega
    m.setFilter("mun-br-fill", munHd.length ? ["!=", ["get", "uf"], scope.uf ?? ""] : null);
    m.setFilter("mun-br-line", munHd.length ? ["!=", ["get", "uf"], scope.uf ?? ""] : null);
    m.setFilter("uf-sel", ["==", ["get", "uf"], scope.uf ?? ""]);
    m.setFilter("mun-sel", ["==", ["get", "cd"], selecionado?.cdIbge ? String(selecionado.cdIbge) : ""]);
  }, [estiloPronto, fcMunBr, fcMunHd, fcUf, fcRotulos, fcLocais, fcPontos, munHd.length, scope.uf, selecionado]);

  // ---------- câmera ----------

  const alvo = useMemo<Bbox | null>(() => {
    if (selecionado && locais.length >= 3) {
      // enquadra onde as pessoas votam (área urbana), sem deixar um local isolado dominar
      const xs = locais.map((x) => x.l.lon as number).sort((a, b) => a - b);
      const ys = locais.map((x) => x.l.lat as number).sort((a, b) => a - b);
      const q = (v: number[], t: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(t * (v.length - 1))))];
      const [x0, x1, y0, y1] = [q(xs, 0.02), q(xs, 0.98), q(ys, 0.02), q(ys, 0.98)];
      const folga = 0.004;
      return [[x0 - folga, y0 - folga], [x1 + folga, y1 + folga]];
    }
    if (selecionado?.cdIbge) {
      const cd = String(selecionado.cdIbge);
      return bboxDe(munBase.filter((f) => f.properties.cd === cd));
    }
    if (scope.uf) return bboxDe(munBase.filter((f) => f.properties.uf === scope.uf && f.properties.cd !== NORONHA));
    if (scope.regiao) return bboxDe(munBase.filter((f) => regiaoDaUf[f.properties.uf] === scope.regiao && f.properties.cd !== NORONHA));
    return null;
  }, [selecionado, locais, scope.uf, scope.regiao, munBase, regiaoDaUf]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !munBase.length) return;
    const w = m.getContainer().clientWidth;
    const pad = Math.max(16, Math.min(56, w * 0.06));
    m.fitBounds(alvo ?? (BR_BOUNDS as Bbox), {
      padding: { top: pad + 36, bottom: pad + 24, left: pad, right: pad },
      maxZoom: selecionado ? 15 : 11,
      duration: 900,
      essential: true,
    });
  }, [alvo, munBase.length, selecionado]);

  // ---------- render ----------

  const carregando = !topoMun || !topoUf || (scope.uf && !munHd.length);

  return (
    <div className="relative h-full w-full">
      <div ref={caixa} className="h-full w-full" aria-label="Mapa do resultado do 2º turno" role="region" />
      {carregando && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs text-ink-3 shadow-card">
          Carregando malha…
        </div>
      )}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card">
        <BotaoMapa rotulo="Aproximar" onClick={() => mapa.current?.zoomIn()}><Plus className="h-4 w-4" /></BotaoMapa>
        <BotaoMapa rotulo="Afastar" onClick={() => mapa.current?.zoomOut()}><Minus className="h-4 w-4" /></BotaoMapa>
        <BotaoMapa rotulo="Ver Brasil inteiro" onClick={props.onBrasil}><Locate className="h-4 w-4" /></BotaoMapa>
      </div>
      {tip && <Tooltip {...tip} bio={camadaBio(camada)} />}
    </div>
  );
}

function BotaoMapa({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={rotulo} title={rotulo}
      className="grid h-9 w-9 place-items-center text-ink-2 hover:bg-soft border-b border-line last:border-b-0">
      {children}
    </button>
  );
}

function Tooltip({ x, y, largura, d, bio }: { x: number; y: number; largura: number; d: TipData; bio: boolean }) {
  const v = vencedor(d.s);
  const p = pctLula(d.s);
  const esquerda = x > largura - 280;
  const t1p = d.t1 && d.t1.lula + d.t1.flavio ? d.t1.lula / (d.t1.lula + d.t1.flavio) : NaN;
  return (
    <div
      className="pointer-events-none absolute z-20 w-64 rounded-xl border border-line bg-card p-3.5 text-xs shadow-xl"
      style={{ left: esquerda ? x - 272 : x + 16, top: Math.max(8, y - 40) }}
    >
      <p className="font-semibold text-sm text-ink leading-tight">{d.titulo}</p>
      {d.sub && <p className="text-muted mt-0.5">{d.sub}</p>}
      <div className="mt-2.5 space-y-1.5">
        {(["lula", "flavio"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: `var(--${k})` }} />
            <span className={`flex-1 ${v === k ? "text-ink font-semibold" : "text-ink-3"}`}>{NOME[k]}</span>
            <span className={`tabular-nums text-sm ${v === k ? "text-ink font-semibold" : "text-ink-3"}`}>
              {pct(k === "lula" ? p : 1 - p)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 border-t border-line pt-2 space-y-1 text-ink-3 tabular-nums">
        {Number.isFinite(t1p) && (
          <p>1º turno · Lula {pct(t1p)} · Flávio {pct(1 - t1p)}</p>
        )}
        <p>{num(d.s.comp)} votantes · {pp(margem(d.s))}</p>
        {bio && (
          <p className="font-medium text-ink-2">
            Sem biometria · 1º {pct(pctSem1(d.s))} → 2º {pct(pctSem2(d.s))}{" "}
            <span className="text-muted">({ppSinal(deltaSem(d.s))})</span>
          </p>
        )}
        {d.nota && <p className="text-late-ink font-medium">{d.nota}</p>}
      </div>
    </div>
  );
}

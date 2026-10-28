"use client";

import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import { num, pct } from "@/lib/mapa";
import { SITE_BASE, hhmm, ufsDoEscopo, type Escopo, type TimelineJson } from "@/lib/site";
import { EscopoPicker, Panel, SectionHeader, Segmented, Skeleton, nomeEscopo } from "@/components/shared/Section";

type Zoom = "dia" | "tarde" | "tardios";
const AMBAR = "var(--late)";
const CINZA = "var(--ink-3)";
const GRID = "var(--line)";
const EIXO = "var(--muted)";

interface Ponto {
  t: number; // hora decimal (início do intervalo)
  antes: number | null;
  depois: number | null;
}

export function TimelineSection() {
  const { data } = useJsonData<TimelineJson>(`${SITE_BASE}/timeline.json`);
  const [escopo, setEscopo] = useState<Escopo>("BR");
  const [zoom, setZoom] = useState<Zoom>("tardios");

  const minutos = useMemo(() => {
    if (!data) return null;
    const ufs = ufsDoEscopo(escopo).filter((u) => data.minutos[u]);
    const n = data.minutos[ufs[0]]?.length ?? 0;
    const soma = new Array(n).fill(0);
    for (const u of ufs) data.minutos[u].forEach((v, i) => (soma[i] += v));
    return soma as number[];
  }, [data, escopo]);

  const stats = useMemo(() => {
    if (!data || !minutos) return null;
    const ini = data.minuto_inicial;
    const i17 = 17 * 60 - ini;
    const total = minutos.reduce((a, b) => a + b, 0);
    const apos = minutos.slice(i17).reduce((a, b) => a + b, 0);
    let ultimo = -1;
    minutos.forEach((v, i) => { if (v > 0) ultimo = i; });
    const faixas = [17, 17.25, 17.5, 18, 19].map((h, k, arr) => {
      const a = Math.round(h * 60) - ini;
      const b = k + 1 < arr.length ? Math.round(arr[k + 1] * 60) - ini : minutos.length;
      return { de: h, ate: k + 1 < arr.length ? arr[k + 1] : null, votos: minutos.slice(a, b).reduce((x, y) => x + y, 0) };
    });
    return { total, apos, ultimo: ultimo >= 0 ? (ultimo + ini) / 60 : null, faixas };
  }, [data, minutos]);

  const serie: Ponto[] = useMemo(() => {
    if (!data || !minutos) return [];
    const ini = data.minuto_inicial;
    const passo = zoom === "dia" ? 5 : 1;
    const de = zoom === "dia" ? 0 : zoom === "tarde" ? 16 * 60 - ini : 17 * 60 - ini;
    const ate = zoom === "dia" ? minutos.length : zoom === "tarde" ? 20 * 60 - ini : 19 * 60 + 15 - ini;
    const out: Ponto[] = [];
    for (let i = de; i < ate; i += passo) {
      const v = minutos.slice(i, i + passo).reduce((a, b) => a + b, 0) / passo;
      const t = (i + ini) / 60;
      const depois = t >= 17;
      // o ponto das 17h aparece nas duas áreas para não deixar buraco
      out.push({ t, antes: !depois || t === 17 ? v : null, depois: depois ? v : null });
    }
    return out;
  }, [data, minutos, zoom]);

  const ultimo = useMemo(() => {
    if (!data) return [];
    const u = data.ultimo_voto;
    const ufs = ufsDoEscopo(escopo).filter((x) => u.ufs[x]);
    const n = u.ufs[ufs[0]]?.length ?? 0;
    return Array.from({ length: n }, (_, i) => ({
      t: u.inicio_h + (i * u.passo_min) / 60,
      secoes: ufs.reduce((a, x) => a + u.ufs[x][i], 0),
    }));
  }, [data, escopo]);

  return (
    <section id={SECTIONS.TIMELINE} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Linha do tempo" title="Minuto a minuto">
          Votos computados pelas urnas a cada minuto, no horário de Brasília. Depois das 17h só vota quem já estava na
          fila — por isso a curva cai, mas não zera de uma vez.
        </SectionHeader>

        {!data || !stats ? <Skeleton /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <EscopoPicker value={escopo} onChange={setEscopo} />
              <Segmented label="Período" value={zoom} onChange={setZoom}
                options={[{ id: "tardios", label: "Só após 17h" }, { id: "tarde", label: "16h–20h" }, { id: "dia", label: "Dia inteiro" }]} />
            </div>

            <div className="grid lg:grid-cols-4 gap-5">
              <Panel className="lg:col-span-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3 className="text-base font-semibold text-ink">Votos por minuto — {nomeEscopo(escopo)}</h3>
                  <div className="flex gap-4 text-xs text-ink-2">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CINZA }} />Até 17h</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: AMBAR }} />Após 17h</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={serie} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => hhmm(v)}
                      ticks={zoom === "dia" ? [6, 8, 10, 12, 14, 16, 18, 20] : zoom === "tarde" ? [16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5]
                        : [17, 17.25, 17.5, 17.75, 18, 18.25, 18.5, 18.75, 19]}
                      stroke={EIXO} tick={{ fontSize: 11 }} />
                    <YAxis stroke={EIXO} tick={{ fontSize: 11 }} width={56} scale={zoom === "tardios" ? "sqrt" : "auto"}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")}k` : String(v))} />
                    <Tooltip content={<TipMinuto passo={zoom === "dia" ? 5 : 1} />} cursor={{ stroke: "var(--line-2)", strokeWidth: 1 }} />
                    {[17, 18, 19].map((h) => (
                      <ReferenceLine key={h} x={h} stroke={h === 17 ? AMBAR : "var(--line-2)"} strokeDasharray={h === 17 ? undefined : "4 4"}
                        label={{ value: `${h}h`, position: "insideTopRight", fill: h === 17 ? "var(--late-ink)" : "var(--muted)", fontSize: 11 }} />
                    ))}
                    <Area dataKey="antes" stroke={CINZA} fill={CINZA} fillOpacity={0.35} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
                    <Area dataKey="depois" stroke={AMBAR} fill={AMBAR} fillOpacity={0.35} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted mt-2">
                  {zoom === "dia" ? "Média por minuto em janelas de 5 min." : "Cada ponto = 1 minuto."}
                  {zoom === "tardios" ? " Eixo vertical em raiz quadrada, para a cauda aparecer (antes das 17h passavam de 100 mil votos por minuto)." : ""} Exterior não incluído (fuso local).
                </p>
              </Panel>

              <Panel>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Após 17h</p>
                <p className="text-3xl font-bold text-late-ink tabular-nums">{num(stats.apos)}</p>
                <p className="text-sm text-ink-3 mb-4">{pct(stats.apos / stats.total, 3)} dos votos de {nomeEscopo(escopo)}</p>
                <ul className="space-y-2 text-sm">
                  {stats.faixas.map((f) => (
                    <li key={f.de} className="flex justify-between gap-2">
                      <span className="text-ink-3">{hhmm(f.de)}{f.ate ? `–${hhmm(f.ate)}` : " em diante"}</span>
                      <span className="text-ink tabular-nums">{num(f.votos)}</span>
                    </li>
                  ))}
                </ul>
                {stats.ultimo && (
                  <p className="text-sm text-ink-3 mt-4 pt-4 border-t border-line">
                    Último voto: <strong className="text-ink">{hhmm(stats.ultimo)}</strong>
                  </p>
                )}
              </Panel>
            </div>

            <Panel className="mt-5">
              <h3 className="text-base font-semibold text-ink mb-1">Quando cada seção recebeu seu último voto</h3>
              <p className="text-xs text-muted mb-3">
                Número de seções de {nomeEscopo(escopo)} por horário do último voto (faixas de 5 min). Seções que terminaram
                antes de 16:30 estão na primeira barra.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ultimo} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap={1}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[16.5, 21]} ticks={[16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5]}
                    tickFormatter={(v) => hhmm(v)} stroke={EIXO} tick={{ fontSize: 11 }} />
                  <YAxis stroke={EIXO} tick={{ fontSize: 11 }} width={56} scale="sqrt"
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")}k` : String(v))} />
                  <Tooltip cursor={{ fill: "var(--soft)" }} content={<TipUltimo />} />
                  <ReferenceLine x={17} stroke="var(--ink)" strokeDasharray="4 4" />
                  <Bar dataKey="secoes" fill={AMBAR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted mt-2">Eixo vertical em raiz quadrada para mostrar as poucas seções que encerraram muito tarde.</p>
            </Panel>
          </>
        )}
      </div>
    </section>
  );
}

interface TipProps {
  active?: boolean;
  payload?: { payload: Record<string, number | null> }[];
  passo?: number;
}

function TipMinuto({ active, payload, passo = 1 }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as unknown as Ponto;
  const v = p.depois ?? p.antes ?? 0;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-3">{hhmm(p.t)}{passo > 1 ? `–${hhmm(p.t + passo / 60)}` : ""}</p>
      <p className="text-ink font-semibold tabular-nums">
        {num(Math.round(v * 10) / 10)} votos{passo > 1 ? "/min (média)" : ""}
      </p>
    </div>
  );
}

function TipUltimo({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { t: number; secoes: number };
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-3">{hhmm(p.t)}–{hhmm(p.t + 5 / 60)}</p>
      <p className="text-ink font-semibold tabular-nums">{num(p.secoes)} seções</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import { UF_NOME, num, pct } from "@/lib/mapa";
import { SITE_BASE, UFS_BR, type ConsistenciaJson, type Estratificado } from "@/lib/site";
import { Panel, SectionHeader, Segmented, Skeleton } from "@/components/shared/Section";

type Metodo = "mesmo_municipio" | "mesmo_local";

const pp = (x: number, d = 2) =>
  `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })} p.p.`;

export function ConsistencySection() {
  const { data } = useJsonData<ConsistenciaJson>(`${SITE_BASE}/consistencia.json`);
  const [escopo, setEscopo] = useState("BR");
  const [metodo, setMetodo] = useState<Metodo>("mesmo_local");

  const ufs = useMemo(() => {
    if (!data) return [];
    return UFS_BR.map((uf) => ({ uf, e: data.escopos[uf]?.[metodo] ?? null }))
      .filter((x): x is { uf: string; e: Estratificado } => !!x.e)
      .sort((a, b) => a.e.diferenca - b.e.diferenca);
  }, [data, metodo]);

  const escala = useMemo(() => {
    const m = Math.max(0.01, ...ufs.flatMap((x) => [Math.abs(x.e.ic95[0]), Math.abs(x.e.ic95[1])]));
    return Math.min(0.15, m * 1.1);
  }, [ufs]);

  const atual = data?.escopos[escopo];

  return (
    <section id={SECTIONS.CONSISTENCY} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Estatística" title="Seções com voto tardio votaram diferente?">
          Compara o % de Lula nas seções que tiveram voto após 17h com as que não tiveram. A comparação direta engana:
          seções com fila tendem a ser urbanas e grandes. Por isso comparamos dentro do mesmo município e dentro do mesmo
          local de votação (mesma escola), com intervalo de confiança por bootstrap.
        </SectionHeader>

        {!data || !atual ? <Skeleton /> : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select value={escopo} onChange={(e) => setEscopo(e.target.value)} aria-label="Escopo"
                className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink-2">
                <option value="BR">Brasil</option>
                {UFS_BR.map((u) => <option key={u} value={u}>{u} — {UF_NOME[u]}</option>)}
              </select>
              <span className="text-xs text-muted">{num(atual.ingenua.secoes_tardias)} seções com voto após 17h</span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Cartao titulo="Comparação direta" sub="Todas as seções, sem controle"
                tardias={atual.ingenua.pct_lula_tardias} normais={atual.ingenua.pct_lula_normais}
                dif={atual.ingenua.pct_lula_tardias - atual.ingenua.pct_lula_normais} ic={null} aviso />
              <Cartao titulo="Mesmo município" sub={atual.mesmo_municipio ? `${num(atual.mesmo_municipio.estratos)} municípios comparados` : ""}
                e={atual.mesmo_municipio} />
              <Cartao titulo="Mesmo local de votação" sub={atual.mesmo_local ? `${num(atual.mesmo_local.estratos)} locais comparados` : ""}
                e={atual.mesmo_local} />
            </div>

            <Panel>
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
                <h3 className="text-base font-semibold text-ink">Diferença por estado</h3>
                <Segmented label="Comparação" value={metodo} onChange={setMetodo}
                  options={[{ id: "mesmo_local", label: "Mesmo local" }, { id: "mesmo_municipio", label: "Mesmo município" }]} />
              </div>
              <p className="text-xs text-muted mb-4">
                Ponto = diferença em pontos percentuais (% Lula nas seções com voto tardio − nas sem). Linha = intervalo de
                95%. Se a linha cruza o zero, a diferença não se distingue de zero. Clique num estado para vê-lo nos cartões.
              </p>
              <div className="grid grid-cols-[44px_1fr_110px] text-[11px] text-muted mb-1">
                <span />
                <div className="flex justify-between"><span>{pp(-escala, 0)}</span><span>0</span><span>{pp(escala, 0)}</span></div>
                <span />
              </div>
              <ul className="space-y-0.5">
                {ufs.map(({ uf, e }) => {
                  const x = (v: number) => `${50 + (Math.max(-escala, Math.min(escala, v)) / escala) * 50}%`;
                  const zero = e.ic95[0] <= 0 && e.ic95[1] >= 0;
                  return (
                    <li key={uf}>
                      <button onClick={() => setEscopo(uf)} aria-pressed={escopo === uf}
                        className={`w-full grid grid-cols-[44px_1fr_110px] items-center gap-0 rounded py-1 hover:bg-soft ${escopo === uf ? "bg-soft" : ""}`}
                        title={`${UF_NOME[uf]}: ${pp(e.diferenca)} [${pp(e.ic95[0])}; ${pp(e.ic95[1])}]`}>
                        <span className="text-xs text-ink-2 text-left pl-1">{uf}</span>
                        <span className="relative h-4">
                          <span className="absolute inset-y-0 left-1/2 w-px bg-ink-3" />
                          <span className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-ink-3"
                            style={{ left: x(e.ic95[0]), width: `calc(${x(e.ic95[1])} - ${x(e.ic95[0])})` }} />
                          <span className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-line-2 ${zero ? "bg-line-2" : "bg-late"}`}
                            style={{ left: x(e.diferenca) }} />
                        </span>
                        <span className="text-xs text-ink-2 text-right tabular-nums pr-1">{pp(e.diferenca, 1)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-4 text-xs text-ink-3 mt-3">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-line-2" />Intervalo inclui zero</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-late" />Intervalo não inclui zero</span>
              </div>
              <p className="text-xs text-muted mt-4">{data.nota} Bootstrap com {num(data.bootstrap)} reamostragens dos estratos.</p>
            </Panel>
          </>
        )}
      </div>
    </section>
  );
}

function Cartao({ titulo, sub, e, tardias, normais, dif, ic, aviso = false }: {
  titulo: string; sub: string; e?: Estratificado | null; tardias?: number; normais?: number; dif?: number;
  ic?: [number, number] | null; aviso?: boolean;
}) {
  const t = e ? e.pct_lula_tardias : tardias;
  const n = e ? e.pct_lula_normais : normais;
  const d = e ? e.diferenca : dif;
  const i = e ? e.ic95 : ic;
  if (t == null || n == null || d == null) {
    return <Panel><p className="text-sm text-muted">{titulo}: poucos dados neste escopo.</p></Panel>;
  }
  return (
    <Panel>
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <p className="text-xs text-muted mb-4">{sub}</p>
      <p className="text-3xl font-bold text-ink tabular-nums">{pp(d)}</p>
      <p className="text-xs text-ink-3 mb-4">
        {i ? <>IC 95%: {pp(i[0])} a {pp(i[1])}</> : "sem intervalo (comparação bruta)"}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-xs text-muted">Lula c/ voto tardio</dt><dd className="text-ink tabular-nums">{pct(t)}</dd></div>
        <div><dt className="text-xs text-muted">Lula sem voto tardio</dt><dd className="text-ink tabular-nums">{pct(n)}</dd></div>
      </dl>
      {aviso && (
        <p className="text-[11px] text-late-ink mt-3">
          Misturar cidades diferentes distorce: capitais têm mais fila e votam diferente do interior.
        </p>
      )}
    </Panel>
  );
}

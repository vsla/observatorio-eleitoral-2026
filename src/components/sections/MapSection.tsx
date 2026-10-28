"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import { COR, MAPA_BASE, UF_NOME, num, pct, toStats, type ResumoJson } from "@/lib/mapa";
import { REGIAO_UF, SITE_BASE, abrirNoConfira, hhmm, ufsDoEscopo, type Escopo, type RankingJson } from "@/lib/site";
import { EscopoPicker, Panel, SectionHeader, Segmented, Skeleton, nomeEscopo } from "@/components/shared/Section";

type Nivel = "estados" | "municipios";
type Metrica = "abs" | "pct";

interface Linha {
  id: string;
  nome: string;
  sub: string;
  pos17: number;
  comp: number;
  secoes: number;
  secoesTardias: number | null;
  ultimo: number | null;
  lula: number;
  flavio: number;
  abrir?: () => void;
}

const MIN_VOTANTES = [0, 1000, 10000, 100000];

export function MapSection() {
  const { data: rk } = useJsonData<RankingJson>(`${SITE_BASE}/ranking.json`);
  const { data: resumo } = useJsonData<ResumoJson>(`${MAPA_BASE}/resumo.json`);
  const [escopo, setEscopo] = useState<Escopo>("BR");
  const [nivel, setNivel] = useState<Nivel>("municipios");
  const [metrica, setMetrica] = useState<Metrica>("abs");
  const [minVot, setMinVot] = useState(1000);
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(25);

  const linhas: Linha[] = useMemo(() => {
    if (!rk || !resumo) return [];
    const ufs = new Set(ufsDoEscopo(escopo));
    let base: Linha[];
    if (nivel === "estados") {
      base = [...ufs].map((uf) => {
        const s = toStats(resumo.ufs[uf].s);
        const tard = rk.rows.filter((r) => r[0] === uf);
        return {
          id: uf, nome: UF_NOME[uf], sub: REGIAO_UF[uf], pos17: s.pos17, comp: s.comp, secoes: s.secoes,
          secoesTardias: tard.reduce((a, r) => a + r[6], 0),
          ultimo: tard.length ? Math.max(...tard.map((r) => r[7])) : null, lula: s.lula, flavio: s.flavio,
        };
      });
    } else {
      base = rk.rows.filter((r) => ufs.has(r[0])).map((r) => ({
        id: `${r[0]}-${r[1]}`, nome: r[2], sub: r[0], pos17: r[5], comp: r[4], secoes: r[3], secoesTardias: r[6],
        ultimo: r[7], lula: r[8], flavio: r[9], abrir: () => abrirNoConfira({ uf: r[0], cdTse: r[1] }),
      }));
    }
    const q = busca.trim().toUpperCase();
    return base
      .filter((l) => !q || l.nome.toUpperCase().includes(q))
      .filter((l) => metrica === "abs" || l.comp >= minVot)
      .sort((a, b) => (metrica === "abs" ? b.pos17 - a.pos17 : b.pos17 / b.comp - a.pos17 / a.comp));
  }, [rk, resumo, escopo, nivel, metrica, minVot, busca]);

  const max = linhas.length ? Math.max(...linhas.map((l) => (metrica === "abs" ? l.pos17 : l.pos17 / l.comp))) : 1;

  return (
    <section id={SECTIONS.MAP} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Visão geográfica" title="Onde os votos tardios aconteceram">
          Ranking de estados e municípios por votos registrados após 17h — em número absoluto ou como proporção do
          comparecimento. Clique num município para conferir suas seções.
        </SectionHeader>

        {!rk || !resumo ? <Skeleton /> : (
          <Panel>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <EscopoPicker value={escopo} onChange={(e) => { setEscopo(e); setLimite(25); }} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Segmented label="Nível" value={nivel} onChange={(v) => { setNivel(v); setLimite(25); }}
                options={[{ id: "municipios", label: "Municípios" }, { id: "estados", label: "Estados" }]} />
              <Segmented label="Métrica" value={metrica} onChange={setMetrica}
                options={[{ id: "abs", label: "Votos após 17h" }, { id: "pct", label: "% do comparecimento" }]} />
              {metrica === "pct" && nivel === "municipios" && (
                <select value={minVot} onChange={(e) => setMinVot(Number(e.target.value))} aria-label="Mínimo de votantes"
                  className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink-2">
                  {MIN_VOTANTES.map((m) => <option key={m} value={m}>{m ? `≥ ${num(m)} votantes` : "Qualquer tamanho"}</option>)}
                </select>
              )}
              {nivel === "municipios" && (
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar município" aria-label="Buscar município"
                    className="w-full rounded-lg border border-line bg-card py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-line-2 focus:outline-none" />
                </div>
              )}
            </div>

            <p className="text-xs text-muted mb-3">
              {num(linhas.length)} {nivel === "estados" ? "estados" : "municípios com voto após 17h"} em {nomeEscopo(escopo)}
              {metrica === "pct" && nivel === "municipios" && minVot > 0 ? ` (≥ ${num(minVot)} votantes — evita distorção de cidades muito pequenas)` : ""}.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums min-w-[640px]">
                <caption className="sr-only">Ranking de votos após 17h</caption>
                <thead className="text-xs text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-2 text-left font-medium w-8">#</th>
                    <th className="py-2 pr-2 text-left font-medium">{nivel === "estados" ? "Estado" : "Município"}</th>
                    <th className="py-2 px-2 text-left font-medium w-[34%]">{metrica === "abs" ? "Votos após 17h" : "% do comparecimento"}</th>
                    <th className="py-2 px-2 text-right font-medium">Seções c/ tardio</th>
                    <th className="py-2 px-2 text-right font-medium">Último voto</th>
                    <th className="py-2 pl-2 text-left font-medium">Vencedor</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, limite).map((l, i) => {
                    const v = metrica === "abs" ? l.pos17 : l.pos17 / l.comp;
                    const venc = l.lula > l.flavio ? "lula" : l.flavio > l.lula ? "flavio" : null;
                    return (
                      <tr key={l.id} onClick={l.abrir}
                        className={`border-b border-line ${l.abrir ? "cursor-pointer hover:bg-soft" : ""}`}>
                        <td className="py-2 pr-2 text-muted">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <span className="text-ink">{l.nome}</span>
                          <span className="text-muted text-xs ml-1.5">{l.sub}</span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded bg-soft">
                              <div className="h-full rounded bg-late" style={{ width: `${Math.max(1, (v / max) * 100)}%` }} />
                            </div>
                            <span className="text-ink w-20 text-right">
                              {metrica === "abs" ? num(l.pos17) : pct(v, 2)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-ink-2">
                          {l.secoesTardias != null ? `${num(l.secoesTardias)} / ${num(l.secoes)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right text-ink-2">{l.ultimo ? hhmm(l.ultimo) : "—"}</td>
                        <td className="py-2 pl-2">
                          {venc && (
                            <span className="inline-flex items-center gap-1.5 text-ink-2">
                              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR[venc] }} />
                              {venc === "lula" ? "Lula" : "Flávio"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {linhas.length > limite && (
              <button onClick={() => setLimite(limite + 50)}
                className="mt-3 w-full rounded-lg border border-line py-2 text-xs text-ink-3 hover:bg-soft">
                Mostrar mais ({num(linhas.length - limite)} restantes)
              </button>
            )}
          </Panel>
        )}
      </div>
    </section>
  );
}

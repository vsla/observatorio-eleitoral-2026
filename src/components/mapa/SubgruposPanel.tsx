"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  COR, SUBGRUPO_LABEL, SUBGRUPO_NOTA, UF_NOME, num, pct, pctLula, somar, toStats, vencedor,
  type LocalEspecial, type Municipio, type ResumoJson, type Stats, type Subgrupo,
} from "@/lib/mapa";
import { BarraResultado } from "./BarraResultado";
import type { MapScope } from "./MapaEleitoral";

const ORDEM: Subgrupo[] = [
  "estabelecimento_penal", "internacao_adolescentes", "aldeia_indigena", "quilombo",
  "voto_em_transito", "exterior", "convencional",
];

interface Props {
  resumo: ResumoJson;
  especiais: LocalEspecial[];
  municipios: Municipio[];
  scope: MapScope;
  regiaoDaUf: Record<string, string>;
  ativo: Subgrupo | null;
  onAtivo: (s: Subgrupo | null) => void;
}

interface Linha {
  nome: string;
  onde: string;
  s: Stats;
}

export function SubgruposPanel({ resumo, especiais, municipios, scope, regiaoDaUf, ativo, onAtivo }: Props) {
  const [busca, setBusca] = useState("");

  const porSub = useMemo(() => {
    const out = new Map<Subgrupo, Stats>();
    if (!scope.uf && !scope.regiao) {
      for (const [k, v] of Object.entries(resumo.subgrupos)) out.set(k as Subgrupo, toStats(v));
      return out;
    }
    const noEscopo = (uf: string) => (scope.uf ? uf === scope.uf : regiaoDaUf[uf] === scope.regiao);
    const acc = new Map<Subgrupo, Stats[]>();
    for (const r of resumo.subgrupos_uf) {
      const uf = r[0] as string;
      if (!noEscopo(uf)) continue;
      const k = r[1] as Subgrupo;
      acc.set(k, [...(acc.get(k) ?? []), toStats(r.slice(2) as number[])]);
    }
    for (const [k, v] of acc) out.set(k, somar(v));
    return out;
  }, [resumo, scope, regiaoDaUf]);

  const linhas: Linha[] = useMemo(() => {
    if (!ativo || ativo === "convencional") return [];
    const q = busca.trim().toUpperCase();
    let base: Linha[];
    if (ativo === "exterior") {
      base = municipios.filter((m) => m.uf === "ZZ").map((m) => ({ nome: m.nome, onde: "Exterior", s: m }));
    } else {
      base = especiais
        .filter((e) => e.subgrupo === ativo)
        .filter((e) => (scope.uf ? e.uf === scope.uf : scope.regiao ? regiaoDaUf[e.uf] === scope.regiao : true))
        .map((e) => ({ nome: e.local, onde: `${e.municipio} (${e.uf})`, s: e }));
    }
    return base
      .filter((l) => !q || l.nome.toUpperCase().includes(q) || l.onde.toUpperCase().includes(q))
      .sort((a, b) => b.s.comp - a.s.comp);
  }, [ativo, busca, especiais, municipios, scope, regiaoDaUf]);

  const placar = useMemo(() => {
    let lula = 0, flavio = 0;
    for (const l of linhas) {
      const v = vencedor(l.s);
      if (v === "lula") lula++;
      else if (v === "flavio") flavio++;
    }
    return { lula, flavio };
  }, [linhas]);

  const escopoNome = scope.uf ? UF_NOME[scope.uf] : scope.regiao ?? "Brasil";

  return (
    <div>
      <p className="text-sm text-ink-3 mb-4">
        Escopo: <span className="text-ink-2">{escopoNome}</span>. Clique num subgrupo para ver cada local
        {" "}e marcá-lo no mapa.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ORDEM.filter((k) => porSub.has(k) && (k !== "exterior" || (!scope.uf && !scope.regiao))).map((k) => {
          const s = porSub.get(k)!;
          const sel = ativo === k;
          return (
            <button
              key={k}
              onClick={() => onAtivo(sel ? null : k)}
              aria-pressed={sel}
              className={`text-left rounded-xl border p-4 transition-colors ${
                sel ? "border-line-2 bg-soft" : "border-line bg-card hover:border-line-2"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{SUBGRUPO_LABEL[k]}</p>
              <p className="text-xs text-muted mb-3 tabular-nums">
                {num(s.secoes)} seções · {num(s.comp)} votantes
              </p>
              <BarraResultado s={s} compacta />
            </button>
          );
        })}
      </div>

      {ativo && ativo !== "convencional" && (
        <div className="mt-6 rounded-xl border border-line bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h4 className="text-base font-semibold text-ink">{SUBGRUPO_LABEL[ativo]} — {escopoNome}</h4>
            <p className="text-xs text-ink-3 tabular-nums">
              Lula venceu em <strong style={{ color: COR.lula }}>{num(placar.lula)}</strong> ·
              Flávio em <strong style={{ color: COR.flavio }}>{num(placar.flavio)}</strong>
            </p>
          </div>
          <p className="text-xs text-muted mb-3">{SUBGRUPO_NOTA[ativo]}</p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou município"
              aria-label="Buscar local"
              className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-line-2 focus:outline-none"
            />
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Resultado por local — {SUBGRUPO_LABEL[ativo]}</caption>
              <thead className="sticky top-0 bg-page text-xs text-muted">
                <tr>
                  <th className="py-2 pr-2 text-left font-medium">Local</th>
                  <th className="py-2 px-2 text-right font-medium">Votantes</th>
                  <th className="py-2 px-2 text-right font-medium">Lula</th>
                  <th className="py-2 px-2 text-right font-medium">Flávio</th>
                  <th className="py-2 pl-2 text-left font-medium">Vencedor</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const v = vencedor(l.s);
                  const p = pctLula(l.s);
                  return (
                    <tr key={i} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <p className="text-ink leading-tight">{l.nome}</p>
                        <p className="text-xs text-muted">{l.onde}</p>
                      </td>
                      <td className="py-2 px-2 text-right text-ink-2">{num(l.s.comp)}</td>
                      <td className="py-2 px-2 text-right text-ink-2">{pct(p)}</td>
                      <td className="py-2 px-2 text-right text-ink-2">{pct(1 - p)}</td>
                      <td className="py-2 pl-2 whitespace-nowrap">
                        {v === "lula" || v === "flavio" ? (
                          <span className="inline-flex items-center gap-1.5 text-ink-2">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR[v] }} />
                            {v === "lula" ? "Lula" : "Flávio"}
                          </span>
                        ) : (
                          <span className="text-muted">{v === "empate" ? "Empate" : "Sem votos"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!linhas.length && <p className="text-sm text-muted py-6 text-center">Nenhum local neste escopo.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

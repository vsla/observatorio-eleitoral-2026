"use client";

import { useState } from "react";
import { COR, NOME, num, pct, UF_NOME, type PerfilJson } from "@/lib/mapa";

interface Props {
  perfil: PerfilJson;
  escopo: string; // "BR", região ou UF
}

const fmtFaixa = (lo: number, hi: number) =>
  lo === 0 ? `até ${hi}%` : hi >= 100 ? `${lo}% ou mais` : `${lo}–${hi}%`;

export function PerfilPanel({ perfil, escopo }: Props) {
  const [dim, setDim] = useState(perfil.dims[0].id);
  const d = perfil.dims.find((x) => x.id === dim)!;
  const linhas = perfil.escopos[escopo]?.[dim] ?? [];
  const nomeEscopo = escopo === "BR" ? "Brasil" : UF_NOME[escopo] ?? escopo;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Dimensão do perfil">
        {perfil.dims.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === dim}
            onClick={() => setDim(x.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              x.id === dim ? "bg-ink text-card" : "bg-soft text-ink-2 hover:bg-soft-2"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-ink-3 mb-4">
        Seções de <span className="text-ink-2">{nomeEscopo}</span> agrupadas pelo % de{" "}
        <span className="text-ink-2">{d.label.toLowerCase()}</span> no eleitorado da seção. Barra = votos válidos
        somados das seções da faixa.
      </p>

      <div className="flex items-center gap-4 text-xs text-ink-2 mb-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.lula }} />{NOME.lula}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.flavio }} />{NOME.flavio}</span>
      </div>

      <ul className="space-y-2.5">
        {d.faixas.map(([lo, hi], i) => {
          const [secoes, eleitores, lula, flavio] = linhas[i] ?? [0, 0, 0, 0];
          const v = lula + flavio;
          const p = v ? lula / v : NaN;
          return (
            <li key={i} className="grid grid-cols-[88px_1fr] sm:grid-cols-[110px_1fr_120px] items-center gap-x-3 gap-y-1">
              <span className="text-sm text-ink-2 tabular-nums">{fmtFaixa(lo, hi)}</span>
              {v ? (
                <div className="relative flex h-6 gap-[2px]" role="img" aria-label={`${fmtFaixa(lo, hi)}: Lula ${pct(p)}, Flávio ${pct(1 - p)}`}>
                  <div className="rounded-l flex items-center pl-2 text-[11px] font-medium text-white tabular-nums overflow-hidden"
                    style={{ width: `${p * 100}%`, background: COR.lula }}>{p > 0.12 ? pct(p, 0) : ""}</div>
                  <div className="rounded-r flex items-center justify-end pr-2 text-[11px] font-medium text-white tabular-nums overflow-hidden"
                    style={{ width: `${(1 - p) * 100}%`, background: COR.flavio }}>{1 - p > 0.12 ? pct(1 - p, 0) : ""}</div>
                  <div className="absolute inset-y-[-3px] left-1/2 w-px bg-ink/60" aria-hidden />
                </div>
              ) : (
                <div className="h-6 rounded bg-soft text-[11px] text-muted flex items-center px-2">sem seções</div>
              )}
              <span className="col-start-2 sm:col-start-auto text-xs text-muted tabular-nums">
                {num(secoes)} seções · {num(eleitores)} eleitores
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted mt-4">
        Linha vertical = 50%. Comparação descritiva entre seções: não indica como cada eleitor votou.
        Fonte do perfil: cadastro eleitoral do TSE por seção (julho/2026).
      </p>
    </div>
  );
}

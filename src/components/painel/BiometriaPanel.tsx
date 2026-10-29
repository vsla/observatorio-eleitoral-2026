"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { useTema } from "@/hooks/useTema";
import {
  PALETA, UF_NOME, deltaSem, num, pct, pctSem1, pctSem2, ppSinal, somar, toStats,
  type Municipio, type ResumoJson, type Stats,
} from "@/lib/mapa";
import type { MapScope } from "@/components/mapa/MapaEleitoral";

type Ordem = "sem2" | "aumento" | "queda";
const MIN_HAB = 300;

interface Linha {
  id: string;
  nome: string;
  sub?: string;
  s: Stats;
  abrir: () => void;
}

/** Sem biometria no 1º × 2º turno, por estado (ou por município dentro de um estado). */
export function BiometriaPanel({ resumo, municipios, scope, regiaoDaUf, onUf, onMun, onCompartilhar }: {
  resumo: ResumoJson; municipios: Municipio[]; scope: MapScope; regiaoDaUf: Record<string, string>;
  onUf: (uf: string) => void; onMun: (m: Municipio) => void; onCompartilhar: () => void;
}) {
  const p = PALETA[useTema()];
  const [ordem, setOrdem] = useState<Ordem>("sem2");
  const [limite, setLimite] = useState(30);

  const { linhas, total, unidade } = useMemo(() => {
    let linhas: Linha[];
    let total: Stats;
    if (scope.uf) {
      const ms = municipios.filter((m) => m.uf === scope.uf);
      total = toStats(resumo.ufs[scope.uf].s);
      linhas = ms.filter((m) => m.hab2 >= MIN_HAB && m.hab1 >= MIN_HAB)
        .map((m) => ({ id: String(m.cdTse), nome: m.nome, sub: m.capital ? "capital" : undefined, s: m, abrir: () => onMun(m) }));
    } else {
      const ufs = Object.entries(resumo.ufs).filter(([u]) => u !== "ZZ" && (!scope.regiao || regiaoDaUf[u] === scope.regiao));
      linhas = ufs.map(([u, v]) => ({ id: u, nome: UF_NOME[u], sub: u, s: toStats(v.s), abrir: () => onUf(u) }));
      total = scope.regiao ? somar(linhas.map((l) => l.s)) : toStats(resumo.brasil);
    }
    const chave = (l: Linha) =>
      ordem === "sem2" ? pctSem2(l.s) : ordem === "aumento" ? deltaSem(l.s) : -deltaSem(l.s);
    linhas.sort((a, b) => (chave(b) || 0) - (chave(a) || 0));
    return { linhas, total, unidade: scope.uf ? "municípios" : "estados" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumo, municipios, scope.uf, scope.regiao, regiaoDaUf, ordem]);

  const visiveis = linhas.slice(0, limite);
  const max = Math.max(0.05, ...visiveis.flatMap((l) => [pctSem1(l.s), pctSem2(l.s)].filter(Number.isFinite))) * 1.05;
  const escopoNome = scope.uf ? UF_NOME[scope.uf] : scope.regiao ?? "Brasil";

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card md:p-6">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Numero rotulo="1º turno · sem biometria" valor={num(total.sem1)} sub={`${pct(pctSem1(total))} de ${num(total.hab1)}`} cor={p.bioT1} />
        <Numero rotulo="2º turno · sem biometria" valor={num(total.sem2)} sub={`${pct(pctSem2(total))} de ${num(total.hab2)}`} cor={p.bioAlto} />
        <div className="rounded-xl bg-soft p-3">
          <p className="text-[11px] text-muted">Variação · {escopoNome}</p>
          <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{ppSinal(deltaSem(total), 2)}</p>
          <button onClick={onCompartilhar}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            <Share2 className="h-3 w-3" /> Compartilhar {escopoNome}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: p.bioT1, background: "var(--card)" }} /> 1º turno
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.bioAlto }} /> 2º turno
          </span>
        </div>
        <select value={ordem} onChange={(e) => { setOrdem(e.target.value as Ordem); setLimite(30); }} aria-label="Ordenar"
          className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-2">
          <option value="sem2">Mais sem biometria (2º turno)</option>
          <option value="aumento">Maior aumento 1º → 2º</option>
          <option value="queda">Maior queda 1º → 2º</option>
        </select>
      </div>

      <ul className="divide-y divide-line">
        {visiveis.map((l) => {
          const a = pctSem1(l.s);
          const b = pctSem2(l.s);
          const x = (v: number) => `${(v / max) * 100}%`;
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          return (
            <li key={l.id}>
              <button onClick={l.abrir} title={`${l.nome}: 1º ${pct(a)} (${num(l.s.sem1)}) → 2º ${pct(b)} (${num(l.s.sem2)})`}
                className="grid w-full grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1.5 py-2 text-left hover:bg-soft sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_9.5rem]">
                <span className="min-w-0 truncate text-sm text-ink">
                  {l.nome}
                  {l.sub && <span className="ml-1 text-[11px] text-muted">{l.sub}</span>}
                </span>
                <span className="relative h-4" aria-hidden>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  {Number.isFinite(lo) && Number.isFinite(hi) && (
                    <span className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-ink-3/50" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
                  )}
                  {Number.isFinite(a) && (
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{ left: x(a), borderColor: p.bioT1, background: "var(--card)" }} />
                  )}
                  {Number.isFinite(b) && (
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--card)]"
                      style={{ left: x(b), background: p.bioAlto }} />
                  )}
                </span>
                <span className="text-right text-xs tabular-nums">
                  <span className="text-ink-3">{pct(a)} → </span>
                  <span className="font-semibold text-ink">{pct(b)}</span>
                  <span className="ml-1.5 hidden text-muted sm:inline">{ppSinal(deltaSem(l.s), 1).replace(" p.p.", "")}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {linhas.length > limite && (
        <button onClick={() => setLimite(limite + 50)}
          className="mt-2 w-full rounded-lg border border-line py-2 text-xs text-ink-3 hover:bg-soft">
          Mostrar mais ({num(linhas.length - limite)} {unidade})
        </button>
      )}
      <p className="mt-4 text-[11px] leading-snug text-muted">
        “Sem biometria” = eleitor liberado pelo mesário sem reconhecimento da digital (título, CPF ou dados pessoais),
        contado no log de cada urna; inclui quem não tem digital cadastrada e quem teve a leitura recusada nas 4 tentativas.
        Não indica fraude nem em quem a pessoa votou.
        {scope.uf && ` Municípios com menos de ${MIN_HAB} eleitores habilitados no log ficam fora da lista.`}
        {" "}Seções cujo log não guardou o 1º turno (≈0,3%) entram só no 2º.
      </p>
    </div>
  );
}

function Numero({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub: string; cor: string }) {
  return (
    <div className="rounded-xl bg-soft p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: cor }} /> {rotulo}
      </p>
      <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{valor}</p>
      <p className="text-xs tabular-nums text-ink-3">{sub}</p>
    </div>
  );
}

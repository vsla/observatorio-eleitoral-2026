"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUp, Share2 } from "lucide-react";
import { useTema } from "@/hooks/useTema";
import {
  MEDIDA_BIO, PALETA, UF_NOME, deltaBio, num, pct, pctBio, ppSinal, qtdBio, somar, toStats,
  type MedidaBio, type Municipio, type ResumoJson, type Stats,
} from "@/lib/mapa";
import type { MapScope } from "@/components/mapa/MapaEleitoral";

type Ordem = "nivel2" | "aumento" | "queda";
const MIN_HAB = 300;

interface Linha {
  id: string;
  nome: string;
  sub?: string;
  s: Stats;
  abrir: () => void;
}

/** Sem biometria no 1º × 2º turno, por estado (ou por município dentro de um estado). */
export function BiometriaPanel({ resumo, municipios, scope, regiaoDaUf, onUf, onMun, onVoltar, onVerMapa, onCompartilhar }: {
  resumo: ResumoJson; municipios: Municipio[]; scope: MapScope; regiaoDaUf: Record<string, string>;
  onUf: (uf: string, m: MedidaBio) => void; onMun: (x: Municipio, m: MedidaBio) => void;
  onVoltar: () => void; onVerMapa: (m: MedidaBio) => void; onCompartilhar: () => void;
}) {
  const p = PALETA[useTema()];
  const [medida, setMedida] = useState<MedidaBio>("falha");
  const [ordem, setOrdem] = useState<Ordem>("nivel2");
  const [limite, setLimite] = useState(30);

  const { linhas, total, unidade } = useMemo(() => {
    let linhas: Linha[];
    let total: Stats;
    if (scope.uf) {
      const ms = municipios.filter((m) => m.uf === scope.uf);
      total = toStats(resumo.ufs[scope.uf].s);
      linhas = ms.filter((m) => m.hab2 >= MIN_HAB && m.hab1 >= MIN_HAB)
        .map((m) => ({ id: String(m.cdTse), nome: m.nome, sub: m.capital ? "capital" : undefined, s: m, abrir: () => onMun(m, medida) }));
    } else {
      const ufs = Object.entries(resumo.ufs).filter(([u]) => u !== "ZZ" && (!scope.regiao || regiaoDaUf[u] === scope.regiao));
      linhas = ufs.map(([u, v]) => ({ id: u, nome: UF_NOME[u], sub: u, s: toStats(v.s), abrir: () => onUf(u, medida) }));
      total = scope.regiao ? somar(linhas.map((l) => l.s)) : toStats(resumo.brasil);
    }
    const chave = (l: Linha) =>
      ordem === "nivel2" ? pctBio(l.s, medida, 2) : ordem === "aumento" ? deltaBio(l.s, medida) : -deltaBio(l.s, medida);
    linhas.sort((a, b) => (chave(b) || 0) - (chave(a) || 0));
    return { linhas, total, unidade: scope.uf ? "municípios" : "estados" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumo, municipios, scope.uf, scope.regiao, regiaoDaUf, ordem, medida]);

  const visiveis = linhas.slice(0, limite);
  const max = Math.max(0.02, ...visiveis.flatMap((l) => [pctBio(l.s, medida, 1), pctBio(l.s, medida, 2)].filter(Number.isFinite))) * 1.05;
  const escopoNome = scope.uf ? UF_NOME[scope.uf] : scope.regiao ?? "Brasil";
  const info = MEDIDA_BIO[medida];

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(scope.uf || scope.regiao) && (
          <button onClick={onVoltar}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-soft">
            <ArrowLeft className="h-3.5 w-3.5" /> Brasil
          </button>
        )}
        <h3 className="font-serif text-xl font-semibold text-ink">{escopoNome}</h3>
        <span className="text-xs text-muted">· {linhas.length} {unidade}</span>
        <button onClick={() => onVerMapa(medida)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-soft">
          <ArrowUp className="h-3.5 w-3.5" /> Ver no mapa
        </button>
      </div>
      <div role="group" aria-label="Medida" className="mb-2 inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-card p-0.5 scrollbar-hide">
        {(Object.keys(MEDIDA_BIO) as MedidaBio[]).map((m) => (
          <button key={m} onClick={() => { setMedida(m); setLimite(30); }} aria-pressed={medida === m}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${medida === m ? "bg-ink text-card" : "text-ink-3 hover:text-ink"}`}>
            {MEDIDA_BIO[m].label}
          </button>
        ))}
      </div>
      <p className="mb-4 max-w-3xl text-xs leading-snug text-ink-3">{info.desc}</p>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Numero rotulo={`1º turno · ${info.curto.toLowerCase()}`} valor={num(qtdBio(total, medida, 1))}
          sub={`${pct(pctBio(total, medida, 1))} de ${num(total.hab1)}`} cor={p.bioT1} />
        <Numero rotulo={`2º turno · ${info.curto.toLowerCase()}`} valor={num(qtdBio(total, medida, 2))}
          sub={`${pct(pctBio(total, medida, 2))} de ${num(total.hab2)}`} cor={p.bioAlto} />
        <div className="rounded-xl bg-soft p-3">
          <p className="text-[11px] text-muted">Variação · {escopoNome}</p>
          <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{ppSinal(deltaBio(total, medida), 2)}</p>
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
          <option value="nivel2">Maior no 2º turno</option>
          <option value="aumento">Maior aumento 1º → 2º</option>
          <option value="queda">Maior queda 1º → 2º</option>
        </select>
      </div>

      <ul className="divide-y divide-line">
        {visiveis.map((l) => {
          const a = pctBio(l.s, medida, 1);
          const b = pctBio(l.s, medida, 2);
          const x = (v: number) => `${(v / max) * 100}%`;
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          return (
            <li key={l.id}>
              <button onClick={l.abrir}
                title={`${l.nome}: 1º ${pct(a)} (${num(qtdBio(l.s, medida, 1))}) → 2º ${pct(b)} (${num(qtdBio(l.s, medida, 2))})`}
                className="grid w-full grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1.5 py-2 text-left hover:bg-soft sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_12.5rem]">
                <span className="min-w-0 truncate text-sm text-ink">
                  {l.nome}
                  {l.sub && <span className="ml-1 text-[11px] text-muted">{l.sub}</span>}
                </span>
                <span className="relative h-4" aria-hidden>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  {Number.isFinite(lo) && Number.isFinite(hi) && (
                    <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-3/50" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
                  )}
                  {Number.isFinite(a) && (
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{ left: x(a), borderColor: p.bioT1, background: "var(--card)" }} />
                  )}
                  {Number.isFinite(b) && (
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                      style={{ left: x(b), background: p.bioAlto }} />
                  )}
                </span>
                <span className="text-right text-xs leading-tight tabular-nums">
                  <span className="block">
                    <span className="text-ink-3">{pct(a)} → </span>
                    <span className="font-semibold text-ink">{pct(b)}</span>
                    <span className="ml-1.5 hidden text-muted sm:inline">{ppSinal(deltaBio(l.s, medida), 1).replace(" p.p.", "")}</span>
                  </span>
                  <span className="block text-[11px] text-muted">
                    {num(qtdBio(l.s, medida, 1))} → {num(qtdBio(l.s, medida, 2))}
                  </span>
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
        Contagem pelo log de cada urna: “digital falhou” = a urna pediu a digital e o eleitor foi liberado sem
        reconhecimento; “sem cadastro” = a urna nem pediu a digital. No 2º turno, a contagem de falhas pelos logs
        (8.637.964) bate com a dos boletins de urna (8.632.488). Não indica fraude nem em quem a pessoa votou.
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

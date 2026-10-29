"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { UF_NOME, fundoVencedor, num, textoVencedor, type Municipio, type Stats } from "@/lib/mapa";
import type { MapScope } from "@/components/mapa/MapaEleitoral";

type Cand = "lula" | "flavio";
type Ordem = "ganho" | "perda" | "alta" | "queda";
type Filtro = "todos" | "ganhou" | "perdeu";

const NOME: Record<Cand, string> = { lula: "Lula", flavio: "Flávio" };

interface Unidade {
  id: string;
  nome: string;
  sub?: string;
  /** votos do candidato no 1º e no 2º turno */
  v1: Record<Cand, number>;
  v2: Record<Cand, number>;
  s: Stats;
  abrir: () => void;
}

const variacao = (u: Unidade, c: Cand) => u.v2[c] - u.v1[c];
const variacaoPct = (u: Unidade, c: Cand) => (u.v1[c] ? variacao(u, c) / u.v1[c] : NaN);
const sinal = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±");
const fmtDelta = (n: number) => `${sinal(n)}${num(Math.abs(n))}`;
const fmtPct = (x: number) =>
  Number.isFinite(x) ? `${sinal(x)}${Math.abs(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";

/** Quanto Lula e Flávio ganharam ou perderam de votos do 1º para o 2º turno, por estado ou município. */
export function GanhosPanel({ municipios, scope, regiaoDaUf, onUf, onMun, onVoltar, onVerMapa }: {
  municipios: Municipio[]; scope: MapScope; regiaoDaUf: Record<string, string>;
  onUf: (uf: string) => void; onMun: (m: Municipio) => void; onVoltar: () => void; onVerMapa: () => void;
}) {
  const [cand, setCand] = useState<Cand>("lula");
  const [ordem, setOrdem] = useState<Ordem>("ganho");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [limite, setLimite] = useState(30);
  const [porMun, setPorMun] = useState(false);
  const listaMun = !!scope.uf || porMun;

  // municípios do escopo (base das contagens "ganhou em N municípios")
  const munsEscopo = useMemo(
    () => municipios.filter((m) => m.uf !== "ZZ" && (scope.uf ? m.uf === scope.uf : !scope.regiao || regiaoDaUf[m.uf] === scope.regiao)),
    [municipios, scope.uf, scope.regiao, regiaoDaUf]
  );

  const unidades: Unidade[] = useMemo(() => {
    const deMun = (m: Municipio): Unidade => ({
      id: String(m.cdTse), nome: m.nome, sub: scope.uf ? (m.capital ? "capital" : undefined) : m.uf,
      v1: { lula: m.t1Lula, flavio: m.t1Flavio }, v2: { lula: m.lula, flavio: m.flavio }, s: m,
      abrir: () => onMun(m),
    });
    if (listaMun) return munsEscopo.map(deMun);
    const porUf = new Map<string, Unidade>();
    for (const m of munsEscopo) {
      let u = porUf.get(m.uf);
      if (!u) {
        const uf = m.uf;
        u = {
          id: uf, nome: UF_NOME[uf], sub: uf, v1: { lula: 0, flavio: 0 }, v2: { lula: 0, flavio: 0 },
          s: { ...m, secoes: 0, aptos: 0, comp: 0, lula: 0, flavio: 0, bn: 0 }, abrir: () => onUf(uf),
        };
        porUf.set(uf, u);
      }
      u.v1.lula += m.t1Lula;
      u.v1.flavio += m.t1Flavio;
      u.v2.lula += m.lula;
      u.v2.flavio += m.flavio;
      u.s.lula += m.lula;
      u.s.flavio += m.flavio;
    }
    return [...porUf.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [munsEscopo, scope.uf, listaMun]);

  const resumo = useMemo(() => {
    const r = { v1: { lula: 0, flavio: 0 }, v2: { lula: 0, flavio: 0 }, ganhou: { lula: 0, flavio: 0 }, perdeu: { lula: 0, flavio: 0 } };
    for (const m of munsEscopo) {
      r.v1.lula += m.t1Lula;
      r.v1.flavio += m.t1Flavio;
      r.v2.lula += m.lula;
      r.v2.flavio += m.flavio;
      for (const c of ["lula", "flavio"] as const) {
        const d = (c === "lula" ? m.lula - m.t1Lula : m.flavio - m.t1Flavio);
        if (d > 0) r.ganhou[c]++;
        else if (d < 0) r.perdeu[c]++;
      }
    }
    return r;
  }, [munsEscopo]);

  const lista = useMemo(() => {
    const f = unidades.filter((u) => filtro === "todos" || (filtro === "ganhou" ? variacao(u, cand) > 0 : variacao(u, cand) < 0));
    const chave = (u: Unidade) => {
      const k = ordem === "ganho" ? variacao(u, cand) : ordem === "perda" ? -variacao(u, cand)
        : ordem === "alta" ? variacaoPct(u, cand) : -variacaoPct(u, cand);
      return Number.isFinite(k) ? k : -Infinity;
    };
    return f.sort((a, b) => chave(b) - chave(a));
  }, [unidades, cand, ordem, filtro]);

  const visiveis = lista.slice(0, limite);
  const maxAbs = Math.max(1, ...visiveis.map((u) => Math.abs(variacao(u, cand))));
  const escopoNome = scope.uf ? UF_NOME[scope.uf] : scope.regiao ?? "Brasil";
  const unidade = listaMun ? "municípios" : "estados";
  const corCand = `var(--${cand})`;

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
        <span className="text-xs text-muted">· {num(munsEscopo.length)} municípios</span>
        <button onClick={onVerMapa}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-soft">
          <ArrowUp className="h-3.5 w-3.5" /> Ver no mapa
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {(["lula", "flavio"] as const).map((c) => {
          const d = resumo.v2[c] - resumo.v1[c];
          return (
            <button key={c} onClick={() => { setCand(c); setLimite(30); }} aria-pressed={cand === c}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${cand === c ? "bg-soft" : "border-transparent bg-soft/60 hover:bg-soft"}`}
              style={cand === c ? { borderColor: `var(--${c})` } : undefined}>
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: `var(--${c})` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${c})` }} /> {c === "lula" ? "Lula" : "Flávio Bolsonaro"}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-ink">{fmtDelta(d)} votos</p>
              <p className="text-xs tabular-nums text-ink-3">
                {num(resumo.v1[c])} no 1º → {num(resumo.v2[c])} no 2º ({fmtPct(resumo.v1[c] ? d / resumo.v1[c] : NaN)})
              </p>
              <p className="mt-1.5 text-xs text-ink-2">
                Ganhou votos em <strong className="tabular-nums">{num(resumo.ganhou[c])}</strong> municípios ·
                perdeu em <strong className="tabular-nums">{num(resumo.perdeu[c])}</strong>
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!scope.uf && (
          <div role="group" aria-label="Listar por" className="inline-flex rounded-full border border-line bg-card p-0.5">
            {([[false, "Estados"], [true, "Municípios"]] as const).map(([v, l]) => (
              <button key={l} onClick={() => { setPorMun(v); setLimite(30); }} aria-pressed={porMun === v}
                className={`rounded-full px-3 py-1 text-xs font-medium ${porMun === v ? "bg-ink text-card" : "text-ink-3 hover:text-ink"}`}>
                {l}
              </button>
            ))}
          </div>
        )}
        <div role="group" aria-label="Filtro" className="inline-flex rounded-full border border-line bg-card p-0.5">
          {([["todos", "Todos"], ["ganhou", `${NOME[cand]} ganhou`], ["perdeu", `${NOME[cand]} perdeu`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => {
                setFiltro(k);
                setLimite(30);
                if (k === "perdeu" && ordem === "ganho") setOrdem("perda");
                if (k === "ganhou" && ordem === "perda") setOrdem("ganho");
              }} aria-pressed={filtro === k}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filtro === k ? "bg-ink text-card" : "text-ink-3 hover:text-ink"}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{num(lista.length)} {unidade}</span>
        <select value={ordem} onChange={(e) => { setOrdem(e.target.value as Ordem); setLimite(30); }} aria-label="Ordenar"
          className="ml-auto rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-2">
          <option value="ganho">Mais ganhou (votos)</option>
          <option value="perda">Mais perdeu (votos)</option>
          <option value="alta">Maior alta (%)</option>
          <option value="queda">Maior queda (%)</option>
        </select>
      </div>

      <ul className="divide-y divide-line">
        {visiveis.map((u) => {
          const d = variacao(u, cand);
          const w = (Math.abs(d) / maxAbs) * 50;
          return (
            <li key={u.id}>
              <button onClick={u.abrir} style={{ backgroundImage: fundoVencedor(u.s) }}
                title={`${u.nome}: ${NOME[cand]} ${num(u.v1[cand])} → ${num(u.v2[cand])} (${fmtDelta(d)}, ${fmtPct(variacaoPct(u, cand))}) · ${textoVencedor(u.s)} no 2º turno`}
                className="grid w-full grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1.5 py-2 text-left hover:bg-soft sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_12.5rem]">
                <span className="min-w-0 truncate text-sm text-ink">
                  <span className="sr-only">{textoVencedor(u.s)}: </span>
                  {u.nome}
                  {u.sub && <span className="ml-1 text-[11px] text-muted">{u.sub}</span>}
                </span>
                <span className="relative h-3" aria-hidden>
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line-2" />
                  {d !== 0 && (
                    <span className="absolute top-0 h-3 rounded-sm"
                      style={d > 0
                        ? { left: "50%", width: `${w}%`, background: corCand }
                        : { right: "50%", width: `${w}%`, background: "var(--ink-3)", opacity: 0.55 }} />
                  )}
                </span>
                <span className="text-right text-xs leading-tight tabular-nums">
                  <span className="block font-semibold" style={{ color: d > 0 ? corCand : "var(--ink-2)" }}>
                    {fmtDelta(d)} <span className="font-normal text-muted">({fmtPct(variacaoPct(u, cand))})</span>
                  </span>
                  <span className="block text-[11px] text-muted">{num(u.v1[cand])} → {num(u.v2[cand])}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {lista.length > limite && (
        <button onClick={() => setLimite(limite + 50)}
          className="mt-2 w-full rounded-lg border border-line py-2 text-xs text-ink-3 hover:bg-soft">
          Mostrar mais ({num(lista.length - limite)} {unidade})
        </button>
      )}
      <p className="mt-4 text-[11px] leading-snug text-muted">
        Votos nominais do candidato no 1º e no 2º turno (TSE, por município). Barra à direita = ganhou votos; à esquerda
        (cinza) = perdeu; tamanho relativo ao maior valor da lista. Fundo da linha = quem venceu o 2º turno. No 2º turno
        os dois herdam votos dos candidatos eliminados, então ganhar votos é o normal; perder costuma vir de abstenção maior.
        Exterior fora da conta.
      </p>
    </div>
  );
}

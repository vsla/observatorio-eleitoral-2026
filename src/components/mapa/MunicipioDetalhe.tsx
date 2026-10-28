"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { formatTime } from "@/lib/format";
import {
  SUBGRUPO_LABEL, margem, num, pct, pctLula, pp,
  type MunDetalheJson, type SecaoRow, type Stats,
} from "@/lib/mapa";
import { BarraResultado } from "./BarraResultado";

const PAGINA = 60;

function stats(sec: SecaoRow[]): Stats {
  const s: Stats = { secoes: 0, aptos: 0, comp: 0, lula: 0, flavio: 0, bn: 0, pos17: 0 };
  for (const r of sec) {
    s.secoes++;
    s.aptos += r[2] ?? 0;
    s.comp += r[3] ?? 0;
    s.lula += r[4] ?? 0;
    s.flavio += r[5] ?? 0;
    s.bn += r[6] ?? 0;
    s.pos17 += r[7] ?? 0;
  }
  return s;
}

interface Props {
  data: MunDetalheJson | null;
  loading: boolean;
  /** índice (em data.locais) do local expandido — controlado de fora para o mapa poder abrir um local */
  aberto: number | null;
  onAberto: (i: number | null) => void;
}

export function MunicipioDetalhe({ data, loading, aberto, onAberto }: Props) {
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const lista = useRef<HTMLUListElement>(null);

  // local aberto pelo mapa: rola até ele
  useEffect(() => {
    if (aberto == null) return;
    lista.current?.querySelector(`[data-local="${aberto}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [aberto]);

  const locais = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toUpperCase();
    return data.locais
      .map((l, i) => ({ ...l, i, s: stats(l.secoes) }))
      .filter((l) => !q || l.nome.toUpperCase().includes(q) || (l.bairro ?? "").toUpperCase().includes(q)
        || l.secoes.some((r) => String(r[1]) === q))
      .sort((a, b) => b.s.comp - a.s.comp);
  }, [data, busca]);

  if (loading || !data) return <div className="h-64 rounded-xl bg-soft animate-pulse" />;

  // o local aberto aparece mesmo que esteja além da página atual ou fora da busca
  const visiveis = locais.slice(0, limite);
  if (aberto != null && !visiveis.some((l) => l.i === aberto)) {
    const l = data.locais[aberto];
    if (l) visiveis.unshift({ ...l, i: aberto, s: stats(l.secoes) });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
        <input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setLimite(PAGINA); }}
          placeholder="Buscar local, bairro ou nº da seção"
          aria-label="Buscar local de votação, bairro ou número da seção"
          className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-line-2 focus:outline-none"
        />
      </div>
      <p className="text-xs text-muted mb-2">
        {num(locais.length)} locais de votação · ordenados por comparecimento
      </p>
      <ul ref={lista} className="min-h-[240px] flex-1 space-y-1.5 overflow-y-auto pr-1 scroll-fino">
        {visiveis.map((l) => (
          <li key={l.i} data-local={l.i}
            className={`rounded-xl border ${aberto === l.i ? "border-line-2 bg-soft" : "border-line bg-card"}`}>
            <button
              onClick={() => onAberto(aberto === l.i ? null : l.i)}
              className="w-full text-left p-2.5 flex gap-2 items-start"
              aria-expanded={aberto === l.i}
            >
              {aberto === l.i
                ? <ChevronDown className="h-4 w-4 mt-0.5 text-muted shrink-0" aria-hidden />
                : <ChevronRight className="h-4 w-4 mt-0.5 text-muted shrink-0" aria-hidden />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-tight truncate">{l.nome}</p>
                <p className="text-xs text-muted truncate">
                  {l.bairro ? `${l.bairro} · ` : ""}{l.s.secoes} seç{l.s.secoes > 1 ? "ões" : "ão"}
                  {l.subgrupo !== "convencional" && (
                    <span className="ml-1 rounded bg-soft-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                      {SUBGRUPO_LABEL[l.subgrupo]}
                    </span>
                  )}
                </p>
                <BarraResultado s={l.s} compacta />
              </div>
            </button>
            {aberto === l.i && <TabelaSecoes secoes={l.secoes} />}
          </li>
        ))}
      </ul>
      {locais.length > limite && (
        <button onClick={() => setLimite(limite + PAGINA)}
          className="mt-2 w-full rounded-lg border border-line py-2 text-xs text-ink-3 hover:bg-soft">
          Mostrar mais ({num(locais.length - limite)} restantes)
        </button>
      )}
    </div>
  );
}

function TabelaSecoes({ secoes }: { secoes: SecaoRow[] }) {
  return (
    <div className="overflow-x-auto border-t border-line">
      <table className="w-full text-xs tabular-nums">
        <caption className="sr-only">Resultado por seção</caption>
        <thead className="text-muted">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Zona/Seção</th>
            <th className="px-2 py-1.5 text-right font-medium">Compar.</th>
            <th className="px-2 py-1.5 text-right font-medium" style={{ color: "var(--lula)" }}>Lula</th>
            <th className="px-2 py-1.5 text-right font-medium" style={{ color: "var(--flavio)" }}>Flávio</th>
            <th className="px-2 py-1.5 text-right font-medium">Br+Nu</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Votos após 17h (Brasília) no log da urna">Pós-17h</th>
            <th className="px-2 py-1.5 text-right font-medium" title="Horário do último voto (Brasília)">Últ. voto</th>
          </tr>
        </thead>
        <tbody className="text-ink-2">
          {secoes.map((r) => {
            const s = { secoes: 1, aptos: r[2] ?? 0, comp: r[3] ?? 0, lula: r[4] ?? 0, flavio: r[5] ?? 0, bn: r[6] ?? 0, pos17: r[7] ?? 0 };
            return (
              <tr key={`${r[0]}-${r[1]}`} className="border-t border-line"
                title={`${pp(margem(s))} · Lula ${pct(pctLula(s))}`}>
                <td className="px-2 py-1">{r[0]}/{r[1]}</td>
                <td className="px-2 py-1 text-right">{num(s.comp)}</td>
                <td className="px-2 py-1 text-right">{num(s.lula)}</td>
                <td className="px-2 py-1 text-right">{num(s.flavio)}</td>
                <td className="px-2 py-1 text-right">{num(s.bn)}</td>
                <td className={`px-2 py-1 text-right ${s.pos17 > 0 ? "text-late-ink" : ""}`}>{r[7] ?? "—"}</td>
                <td className="px-2 py-1 text-right">{r[8] != null ? formatTime(r[8]) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

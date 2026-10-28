import { COR, NOME, pct, pctLula, type Stats } from "@/lib/mapa";

/** Barra 100% Lula × Flávio (votos válidos) com rótulos diretos. */
export function BarraResultado({ s, compacta = false }: { s: Stats; compacta?: boolean }) {
  const p = pctLula(s);
  if (!Number.isFinite(p)) return <p className="text-xs text-muted mt-1">Sem votos válidos</p>;
  const h = compacta ? "h-1.5" : "h-3";
  return (
    <div className={compacta ? "mt-1.5" : ""}>
      {!compacta && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-ink-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm mr-1.5 align-middle" style={{ background: COR.lula }} />
            {NOME.lula} <strong className="tabular-nums text-ink">{pct(p)}</strong>
          </span>
          <span className="text-ink-2">
            <strong className="tabular-nums text-ink">{pct(1 - p)}</strong> {NOME.flavio}
            <span className="inline-block h-2.5 w-2.5 rounded-sm ml-1.5 align-middle" style={{ background: COR.flavio }} />
          </span>
        </div>
      )}
      <div className={`flex ${h} w-full gap-[2px]`} role="img"
        aria-label={`${NOME.lula} ${pct(p)}, ${NOME.flavio} ${pct(1 - p)}`}>
        <div className="rounded-l-full" style={{ width: `${p * 100}%`, background: COR.lula }} />
        <div className="rounded-r-full" style={{ width: `${(1 - p) * 100}%`, background: COR.flavio }} />
      </div>
      {compacta && (
        <p className="text-[11px] text-muted mt-1 tabular-nums">
          Lula {pct(p)} · Flávio {pct(1 - p)}
        </p>
      )}
    </div>
  );
}

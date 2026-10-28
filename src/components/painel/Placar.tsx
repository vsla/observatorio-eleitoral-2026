import { NOME, num, pct, type Stats } from "@/lib/mapa";

/** Placar nacional: os dois finalistas, barra com marca de 50% e totais. */
export function Placar({ s }: { s: Stats }) {
  const validos = s.lula + s.flavio;
  const pl = s.lula / validos;
  const venceuLula = s.lula > s.flavio;

  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-4 shadow-card sm:px-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <Lado nome="Lula" partido="PT · 13" cor="var(--lula)" />
        <p className="hidden md:block text-center font-serif text-2xl font-semibold tracking-tight text-ink">
          <span style={{ color: venceuLula ? "var(--lula)" : "var(--flavio)" }}>{venceuLula ? NOME.lula : "Flávio"}</span>{" "}
          é eleito presidente
        </p>
        <Lado nome="Flávio" partido="PL · 22" cor="var(--flavio)" direita />
      </div>

      <div className="relative">
        <div className="flex h-11 overflow-hidden rounded-lg sm:h-12" role="img"
          aria-label={`${NOME.lula} ${pct(pl, 2)}, ${NOME.flavio} ${pct(1 - pl, 2)}`}>
          <div className="flex items-center justify-between gap-2 px-3 text-white" style={{ width: `${pl * 100}%`, background: "var(--lula)" }}>
            <span className="text-2xl font-bold tabular-nums sm:text-3xl">{pct(pl, 2)}</span>
            <span className="hidden text-xs font-medium tabular-nums opacity-90 lg:inline">{num(s.lula)} votos</span>
          </div>
          <div className="w-[2px] bg-card" />
          <div className="flex flex-1 items-center justify-between gap-2 px-3 text-white" style={{ background: "var(--flavio)" }}>
            <span className="hidden text-xs font-medium tabular-nums opacity-90 lg:inline">{num(s.flavio)} votos</span>
            <span className="ml-auto text-2xl font-bold tabular-nums sm:text-3xl">{pct(1 - pl, 2)}</span>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-1.5 -bottom-1.5 left-1/2 w-0.5 -translate-x-1/2 bg-ink" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-card px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow-card">
          50%
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-ink-3 tabular-nums">
        <span>Diferença: <strong className="text-ink">{num(Math.abs(s.lula - s.flavio))}</strong> votos</span>
        <span className="lg:hidden">{num(s.lula)} × {num(s.flavio)}</span>
        <span>Comparecimento {num(s.comp)} · {num(s.secoes)} seções · <span className="font-medium text-accent">100% apurado</span> · TSE</span>
      </div>
    </div>
  );
}

function Lado({ nome, partido, cor, direita = false }: { nome: string; partido: string; cor: string; direita?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${direita ? "flex-row-reverse text-right" : ""}`}>
      <span className="grid h-10 w-10 place-items-center rounded-full font-serif text-lg font-bold text-white" style={{ background: cor }}>
        {nome[0]}
      </span>
      <div>
        <p className="text-lg font-semibold leading-tight text-ink">{nome}</p>
        <p className="text-[11px] font-medium" style={{ color: cor }}>{partido}</p>
      </div>
    </div>
  );
}

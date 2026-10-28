import type { ReactNode } from "react";
import { REGIAO_UF, UFS_BR, type Escopo } from "@/lib/site";
import { UF_NOME } from "@/lib/mapa";

export function SectionHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{kicker}</p>
      <h2 className="max-w-3xl font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h2>
      {children && <div className="mt-2 max-w-2xl text-ink-3">{children}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-2xl border border-line bg-card p-5 shadow-card ${className}`}>{children}</div>;
}

export function Skeleton({ h = "h-96" }: { h?: string }) {
  return <div className={`${h} rounded-2xl bg-soft border border-line animate-pulse`} />;
}

const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

/** Chips Brasil/regiões + select de UF. Valor: "BR", região ou UF. */
export function EscopoPicker({ value, onChange }: { value: Escopo; onChange: (e: Escopo) => void }) {
  const ehUf = !!REGIAO_UF[value];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {["BR", ...REGIOES].map((r) => {
        const ativo = value === r;
        return (
          <button
            key={r}
            onClick={() => onChange(r)}
            aria-pressed={ativo}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              ativo ? "bg-ink text-card" : "bg-soft text-ink-2 hover:bg-soft-2"
            }`}
          >
            {r === "BR" ? "Brasil" : r}
          </button>
        );
      })}
      <select
        value={ehUf ? value : ""}
        onChange={(e) => onChange(e.target.value || "BR")}
        aria-label="Estado"
        className={`rounded-lg border px-2.5 py-1.5 text-xs ${
          ehUf ? "border-line-2 bg-soft-2 text-ink" : "border-line bg-card text-ink-2"
        }`}
      >
        <option value="">Estado…</option>
        {UFS_BR.map((u) => (
          <option key={u} value={u}>{u} — {UF_NOME[u]}</option>
        ))}
      </select>
    </div>
  );
}

export function nomeEscopo(e: Escopo): string {
  return e === "BR" ? "Brasil" : UF_NOME[e] ?? e;
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.id ? "bg-ink text-card" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

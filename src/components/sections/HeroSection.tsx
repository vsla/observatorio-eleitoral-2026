"use client";

import { Clock, Landmark, MapPin, Vote } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { SectionHeader } from "@/components/shared/Section";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import { num, pct } from "@/lib/mapa";
import { SITE_BASE, hhmm, type NacionalJson } from "@/lib/site";

/** "A pergunta central": os votos após 17h poderiam ter mudado o resultado? */
export function HeroSection() {
  const { data } = useJsonData<NacionalJson>(`${SITE_BASE}/nacional.json`);

  return (
    <section id={SECTIONS.HERO} className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeader kicker="A pergunta central" title="Os votos após as 17h poderiam ter mudado o resultado?">
          Análise dos logs de todas as urnas do 2º turno: cada voto tem horário registrado. Cruzamos com o resultado
          oficial do TSE, seção por seção.
        </SectionHeader>

        {!data ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-soft" />)}
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Votos após 17h" value={data.tardios.votos} highlight icon={<Clock className="h-4 w-4" />} />
              <StatCard label="Seções com voto após 17h" value={data.tardios.secoes} icon={<MapPin className="h-4 w-4" />} />
              <StatCard label="Diferença oficial" value={data.resultado.diferenca} icon={<Landmark className="h-4 w-4" />} />
              <StatCard label="Comparecimento" value={data.resultado.comparecimento} icon={<Vote className="h-4 w-4" />} />
            </div>
            <Resposta d={data} />
          </>
        )}
      </div>
    </section>
  );
}

function Resposta({ d }: { d: NacionalJson }) {
  const { resultado: r, tardios: t } = d;
  const fracao = t.votos / r.diferenca;
  const piorCaso = r.diferenca - t.votos;

  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-card md:p-10">
      <div className="mb-8 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-ink-2">Diferença entre os candidatos</span>
            <span className="font-semibold tabular-nums text-ink">{num(r.diferenca)}</span>
          </div>
          <div className="h-7 rounded-md bg-ink-3/70" />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-ink-2">Todos os votos registrados após 17h</span>
            <span className="font-semibold tabular-nums text-late-ink">{num(t.votos)}</span>
          </div>
          <div className="relative h-7 rounded-md bg-soft">
            <div className="absolute inset-y-0 left-0 rounded-md bg-late" style={{ width: `max(${fracao * 100}%, 4px)` }} />
          </div>
        </div>
        <p className="text-xs text-muted">Mesma escala nas duas barras.</p>
      </div>

      <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink-2">
        <p>
          Matematicamente, <strong className="text-ink">não</strong>. Os{" "}
          <strong className="text-late-ink">{num(t.votos)} votos</strong> registrados após as 17h (Brasília) equivalem a{" "}
          <strong className="text-ink">{pct(t.pct_diferenca, 2)}</strong> da diferença final. Mesmo no cenário extremo
          — todos eles terem ido para o vencedor e serem descontados — a diferença ainda seria de{" "}
          <strong className="tabular-nums text-ink">{num(piorCaso)}</strong> votos.
        </p>
        <p className="text-base text-ink-3">
          Eles aconteceram em {num(t.secoes)} das {num(t.secoes_total)} seções ({num(t.municipios)} municípios). O último
          voto do país foi às {hhmm(t.ultimo_voto_max)}. O log da urna registra o <em>horário</em> de cada voto, não o
          candidato — abaixo você explora onde e quando eles ocorreram e confere seção por seção.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <a href={`#${SECTIONS.TIMELINE}`} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-card hover:opacity-90">
          Minuto a minuto
        </a>
        <a href={`#${SECTIONS.EXPLORE}`} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink-2 hover:bg-soft">
          Confira sua seção
        </a>
      </div>
      <p className="mt-6 text-xs text-muted">
        Exterior fora da conta (horário local de cada país: {num(d.exterior.votos_apos_17_local)} votos após 17h locais).
        Dados processados em {d.gerado_em}.
      </p>
    </div>
  );
}

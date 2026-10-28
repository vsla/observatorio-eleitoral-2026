"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import {
  COR, MAPA_BASE, NOME, num, parseMunicipios, pct, somar, toStats,
  type MunicipiosJson, type ResumoJson, type Stats,
} from "@/lib/mapa";
import { abrirNoConfira, ufsDoEscopo, type Escopo } from "@/lib/site";
import { EscopoPicker, Panel, SectionHeader, Skeleton, nomeEscopo } from "@/components/shared/Section";

// Cada cenário supõe em quem foram os votos tardios e mostra a margem SEM eles
// (ou seja, o quanto eles pesaram no resultado).
const CENARIOS = [
  { id: "lula", nome: "Se foram 100% para Lula", lula: 1 },
  { id: "flavio", nome: "Se foram 100% para Flávio Bolsonaro", lula: 0 },
  { id: "meio", nome: "Se foram divididos 50/50", lula: 0.5 },
] as const;

export function ScenariosSection() {
  const { data: resumo } = useJsonData<ResumoJson>(`${MAPA_BASE}/resumo.json`);
  const { data: munJson } = useJsonData<MunicipiosJson>(`${MAPA_BASE}/municipios.json`);
  const [escopo, setEscopo] = useState<Escopo>("BR");

  const municipios = useMemo(() => (munJson ? parseMunicipios(munJson) : []), [munJson]);

  const s: Stats | null = useMemo(() => {
    if (!resumo) return null;
    const ufs = ufsDoEscopo(escopo);
    const soma = somar(ufs.map((u) => toStats(resumo.ufs[u].s)));
    if (escopo !== "BR") return soma;
    // Brasil: resultado oficial inclui exterior; votos após 17h só no Brasil (exterior está em hora local)
    const br = toStats(resumo.brasil);
    return { ...br, pos17: soma.pos17 };
  }, [resumo, escopo]);

  const viraveis = useMemo(() => {
    const ufs = new Set(ufsDoEscopo(escopo));
    return municipios
      .filter((m) => ufs.has(m.uf) && m.pos17 > 0 && m.pos17 >= Math.abs(m.lula - m.flavio))
      .sort((a, b) => b.pos17 - a.pos17);
  }, [municipios, escopo]);

  if (!s) {
    return (
      <section id={SECTIONS.SCENARIOS} className="py-20 px-4"><div className="max-w-6xl mx-auto"><Skeleton /></div></section>
    );
  }

  const dif = s.lula - s.flavio;
  // margem (Lula − Flávio) descontando os votos tardios conforme a hipótese
  const linhas = CENARIOS.map((c) => {
    const tardLula = Math.round(s.pos17 * c.lula);
    return { ...c, margem: dif - tardLula + (s.pos17 - tardLula) };
  });
  const escala = Math.max(...linhas.map((x) => Math.abs(x.margem)), Math.abs(dif)) * 1.05;

  return (
    <section id={SECTIONS.SCENARIOS} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Simulação" title="Laboratório de cenários">
          Três hipóteses fixas e extremas sobre os votos registrados após 17h. São limites matemáticos — o log da urna não
          diz em quem cada eleitor votou.
        </SectionHeader>

        <div className="mb-4"><EscopoPicker value={escopo} onChange={setEscopo} /></div>

        <div className="grid lg:grid-cols-5 gap-5">
          <Panel className="lg:col-span-3">
            <h3 className="text-base font-semibold text-ink mb-1">Margem final em cada cenário — {nomeEscopo(escopo)}</h3>
            <p className="text-xs text-muted mb-5">
              Margem que sobraria sem os {num(s.pos17)} votos tardios, conforme a hipótese sobre em quem eles foram.
              Barra para a direita = Lula à frente; para a esquerda = Flávio à frente.
            </p>
            <ul className="space-y-5">
              <LinhaMargem rotulo="Resultado oficial" margem={dif} escala={escala} destaque />
              {linhas.map((x) => (
                <LinhaMargem key={x.id} rotulo={x.nome} margem={x.margem} escala={escala}
                  muda={Math.sign(x.margem) !== Math.sign(dif)} />
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-soft p-4 text-sm text-ink-2">
              {Math.abs(dif) > s.pos17 ? (
                <>Em {nomeEscopo(escopo)}, a diferença ({num(Math.abs(dif))}) é <strong className="text-ink">
                  {num(Math.round(Math.abs(dif) / Math.max(1, s.pos17)))}×</strong> maior que todos os votos tardios
                  ({num(s.pos17)}). <strong className="text-ink">Nenhum cenário muda o vencedor.</strong></>
              ) : (
                <><AlertTriangle className="inline h-4 w-4 text-late-ink mr-1 -mt-0.5" aria-hidden />
                  Em {nomeEscopo(escopo)}, os votos tardios ({num(s.pos17)}) são maiores ou iguais à diferença
                  ({num(Math.abs(dif))}): num cenário extremo, o vencedor <strong className="text-ink">poderia</strong> ser outro.</>
              )}
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <h3 className="text-base font-semibold text-ink mb-1">Municípios onde um cenário extremo vira o resultado local</h3>
            <p className="text-xs text-muted mb-3">
              Votos tardios ≥ diferença entre os candidatos no município. Não indica que algo aconteceu — só que a margem
              local foi menor que o número de votos tardios.
            </p>
            <p className="text-2xl font-bold text-ink tabular-nums mb-3">
              {num(viraveis.length)} <span className="text-sm font-normal text-ink-3">municípios em {nomeEscopo(escopo)}</span>
            </p>
            <ul className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
              {viraveis.slice(0, 200).map((m) => (
                <li key={m.cdTse}>
                  <button onClick={() => abrirNoConfira({ uf: m.uf, cdTse: m.cdTse })}
                    className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-soft text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-ink truncate">{m.nome} <span className="text-muted">· {m.uf}</span></span>
                      <span className="text-xs text-ink-3 tabular-nums shrink-0">
                        dif. {num(Math.abs(m.lula - m.flavio))} · tardios <span className="text-late-ink">{num(m.pos17)}</span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {!viraveis.length && <p className="text-sm text-muted">Nenhum município neste escopo.</p>}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function LinhaMargem({ rotulo, margem, escala, destaque = false, muda = false }:
  { rotulo: string; margem: number; escala: number; destaque?: boolean; muda?: boolean }) {
  const w = (Math.abs(margem) / escala) * 50;
  const lula = margem >= 0;
  return (
    <li>
      <div className="flex justify-between text-sm mb-1.5 gap-2">
        <span className={destaque ? "text-ink font-semibold" : "text-ink-2"}>{rotulo}</span>
        <span className="tabular-nums text-ink-2">
          {lula ? NOME.lula : NOME.flavio} +{num(Math.abs(margem))}
          {muda && <span className="ml-2 rounded bg-late px-1.5 py-0.5 text-[11px] text-late-ink">vencedor muda</span>}
        </span>
      </div>
      <div className="relative h-5 rounded bg-soft">
        <div className="absolute inset-y-[-4px] left-1/2 w-px bg-ink-3" aria-hidden />
        <div className={`absolute inset-y-0 ${lula ? "rounded-r" : "rounded-l"}`}
          style={{ [lula ? "left" : "right"]: "50%", width: `${w}%`, background: lula ? COR.lula : COR.flavio, opacity: destaque ? 1 : 0.75 }} />
      </div>
      <p className="sr-only">{pct(w / 50)} da escala</p>
    </li>
  );
}

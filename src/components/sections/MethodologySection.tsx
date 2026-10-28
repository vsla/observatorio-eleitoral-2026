"use client";

import { AlertCircle, Database, ExternalLink, ShieldCheck } from "lucide-react";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import { num, pct } from "@/lib/mapa";
import { SITE_BASE, type MetadataJson } from "@/lib/site";
import { Panel, SectionHeader } from "@/components/shared/Section";

const PASSOS = [
  ["Coleta", "Download do log de cada seção no Portal Resultados do TSE (pleito 3221). Seções agregadas — que votam na urna de outra seção — não têm log próprio e são contadas na seção principal."],
  ["Leitura", "Cada log (.jez) é um ZIP com logd.dat. Quando a urna foi substituída no dia, o log da urna anterior vem aninhado e também é lido: os votos se dividem entre as duas."],
  ["Votos", "Conta-se cada linha “O voto do eleitor foi computado” do dia 25/10/2026, com seu horário."],
  ["Fuso", "Logs estão na hora local da urna. O fuso é estimado pela hora em que a urna ficou pronta e harmonizado por município; tudo é convertido para Brasília."],
  ["Resultado", "Votos por candidato, comparecimento e brancos/nulos vêm dos arquivos oficiais de votação por seção do TSE."],
  ["Cruzamento", "Log e resultado são unidos por município, zona e seção; a contagem do log é conferida com o comparecimento oficial."],
  ["Contexto", "Locais de votação (tipo, coordenadas) e perfil do eleitorado por seção vêm do cadastro do TSE; municípios ligados à malha do IBGE."],
  ["Estatística", "Comparações entre seções com e sem voto tardio dentro do mesmo município ou local, com bootstrap por estrato."],
];

const LIMITES = [
  ["Horário ≠ candidato", "O log registra quando o voto foi computado, nunca em quem. Os cenários são hipóteses, não estimativas."],
  ["Fila ≠ prorrogação", "Votar após 17h é previsto em lei para quem já estava na fila às 17h. Não inferimos a causa de cada voto tardio."],
  ["Correlação ≠ causalidade", "Diferenças entre seções refletem quem vota onde (bairro, idade, renda), não o efeito do horário."],
  ["Fuso estimado", "Inferido pela abertura da urna; urnas com relógio ou abertura atípicos podem ter fuso errado."],
  ["Subgrupos por nome", "Aldeias e quilombos são identificados pelo nome do local de votação — aproximação."],
  ["Exterior", "Fica fora da contagem “após 17h de Brasília”: cada país vota no seu fuso."],
];

export function MethodologySection() {
  const { data } = useJsonData<MetadataJson>(`${SITE_BASE}/metadata.json`);
  const c = data?.cobertura;

  return (
    <section id={SECTIONS.METHODOLOGY} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Transparência" title="Metodologia e fontes">
          Como os dados foram coletados, cruzados e conferidos. Todo o processo é reproduzível a partir dos arquivos públicos do TSE.
        </SectionHeader>

        {c && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Num k="Seções com urna" v={num(c.secoes_principais)} sub={`+ ${num(c.secoes_agregadas)} agregadas`} />
            <Num k="Seções com log" v={pct(c.secoes_com_log / c.secoes_principais, 2)} sub={`${num(c.secoes_sem_log.length)} sem log publicado`} />
            <Num k="Log confere com o oficial" v={pct(c.secoes_conciliadas / c.secoes_com_log, 3)}
              sub={`${num(c.secoes_nao_conciliadas.length)} seções divergentes`} />
            <Num k="Votos no log × comparecimento" v={num(c.votos_log)} sub={`oficial: ${num(c.comparecimento_secoes_com_log)}`} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-accent" aria-hidden />
              <h3 className="text-base font-semibold text-ink">Como foi feito</h3>
            </div>
            <ol className="space-y-3 text-sm">
              {PASSOS.map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="text-accent font-mono text-xs mt-0.5 shrink-0 w-4 text-right">{i + 1}</span>
                  <span><span className="text-ink-2 font-medium">{t}.</span> <span className="text-ink-3">{d}</span></span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-late-ink" aria-hidden />
              <h3 className="text-base font-semibold text-ink">Limitações</h3>
            </div>
            <ul className="space-y-3 text-sm">
              {LIMITES.map(([t, d]) => (
                <li key={t}><span className="text-ink-2 font-medium block">{t}</span><span className="text-muted text-xs">{d}</span></li>
              ))}
            </ul>
          </Panel>

          {c && (
            <Panel>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-accent" aria-hidden />
                <h3 className="text-base font-semibold text-ink">Exceções conhecidas</h3>
              </div>
              <p className="text-sm text-ink-3 mb-2">Seções em que a contagem do log diverge do comparecimento oficial:</p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs tabular-nums">
                  <thead className="text-muted"><tr>
                    <th className="text-left py-1 font-medium">Seção</th><th className="text-right py-1 font-medium">Log</th>
                    <th className="text-right py-1 font-medium">Oficial</th><th className="text-left py-1 pl-3 font-medium">Origem do BU</th>
                  </tr></thead>
                  <tbody className="text-ink-2">
                    {c.secoes_nao_conciliadas.map((s) => (
                      <tr key={`${s.uf}${s.zona}${s.secao}${s.municipio}`} className="border-t border-line">
                        <td className="py-1">{s.municipio} ({s.uf}) Z{s.zona} S{s.secao}</td>
                        <td className="text-right py-1">{num(s.log)}</td><td className="text-right py-1">{num(s.comparecimento)}</td>
                        <td className="py-1 pl-3 text-muted">{s.origem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-ink-3">
                {num(c.secoes_sem_log.length)} seções sem log publicado pelo TSE
                {c.secoes_sem_log.length ? ` (${[...new Set(c.secoes_sem_log.map((s) => s.uf))].join(", ")})` : ""} — a maioria no
                exterior, apuradas sem urna eletrônica.
              </p>
            </Panel>
          )}

          {data && (
            <Panel>
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink className="w-4 h-4 text-accent" aria-hidden />
                <h3 className="text-base font-semibold text-ink">Fontes</h3>
              </div>
              <ul className="space-y-3 text-sm">
                {data.fontes.map((f) => (
                  <li key={f.arquivo}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-accent break-all">{f.arquivo}</a>
                    {f.sha256 && (
                      <span className="block text-[10px] text-muted font-mono break-all" title="SHA-256 do arquivo usado">
                        sha256 {f.sha256}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-4">{data.eleicao}. Processado em {data.gerado_em}.</p>
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}

function Num({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <Panel>
      <p className="text-xs text-muted uppercase tracking-wider mb-2">{k}</p>
      <p className="text-2xl font-bold text-ink tabular-nums">{v}</p>
      <p className="text-xs text-ink-3 mt-1">{sub}</p>
    </Panel>
  );
}

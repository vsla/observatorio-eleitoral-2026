"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ChevronRight, Clock, Search, X } from "lucide-react";
import { SECTIONS } from "@/lib/constants";
import { useJsonData } from "@/hooks/useJsonData";
import { useTema } from "@/hooks/useTema";
import {
  CAMADAS, MAPA_BASE, MARGEM_MAX, PALETA, REGIOES, SUBGRUPO_LABEL, UF_NOME, VIRADA_LABEL,
  corMargem, corSeq, dominio, margem, num, parseEspeciais, parseMunicipios, pct, pctAbstencao,
  pctBrancoNulo, pctLula, pctPos17, pp, somar, toStats, valorCamada, vencedor, viradaCor,
  type Camada, type LocalEspecial, type MunDetalheJson, type Municipio, type MunicipiosJson,
  type PerfilJson, type ResumoJson, type Stats, type Subgrupo, type Virada,
} from "@/lib/mapa";
import { SITE_BASE, type NacionalJson } from "@/lib/site";
import { MapaEleitoral, type MapScope, type NivelCor } from "@/components/mapa/MapaEleitoral";
import { BarraResultado } from "@/components/mapa/BarraResultado";
import { MunicipioDetalhe } from "@/components/mapa/MunicipioDetalhe";
import { SubgruposPanel } from "@/components/mapa/SubgruposPanel";
import { PerfilPanel } from "@/components/mapa/PerfilPanel";
import { Placar } from "./Placar";

type FiltroCapital = "todos" | "capitais" | "interior";
const EXTERIOR = "Exterior";
const SUBGRUPOS_MINI: Subgrupo[] = [
  "estabelecimento_penal", "internacao_adolescentes", "aldeia_indigena", "quilombo", "voto_em_transito",
];
const SUBGRUPO_CURTO: Partial<Record<Subgrupo, string>> = {
  estabelecimento_penal: "Presídios",
  internacao_adolescentes: "Internação de adolescentes",
  aldeia_indigena: "Aldeias indígenas",
  quilombo: "Quilombos",
  voto_em_transito: "Voto em trânsito",
};

export function PainelResultados() {
  const { data: resumo } = useJsonData<ResumoJson>(`${MAPA_BASE}/resumo.json`);
  const { data: munJson } = useJsonData<MunicipiosJson>(`${MAPA_BASE}/municipios.json`);
  const { data: espJson } = useJsonData<MunicipiosJson>(`${MAPA_BASE}/especiais.json`);
  const { data: perfil } = useJsonData<PerfilJson>(`${MAPA_BASE}/perfil.json`);
  const { data: nacional } = useJsonData<NacionalJson>(`${SITE_BASE}/nacional.json`);

  const [regiao, setRegiao] = useState<string | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [mun, setMun] = useState<Municipio | null>(null);
  const [camada, setCamada] = useState<Camada>("margem");
  const [nivel, setNivel] = useState<NivelCor>("municipios");
  const [capital, setCapital] = useState<FiltroCapital>("todos");
  const [subgrupo, setSubgrupo] = useState<Subgrupo | null>(null);
  const [localAberto, setLocalAberto] = useState<number | null>(null);

  const municipios = useMemo(() => (munJson ? parseMunicipios(munJson) : []), [munJson]);
  const especiais = useMemo(() => (espJson ? parseEspeciais(espJson) : []), [espJson]);
  const regiaoDaUf = useMemo(() => {
    const m: Record<string, string> = {};
    if (resumo) for (const [k, v] of Object.entries(resumo.ufs)) m[k] = v.regiao;
    return m;
  }, [resumo]);

  const { data: detalhe, loading: carregandoDetalhe } = useJsonData<MunDetalheJson>(
    mun ? `${MAPA_BASE}/mun/${mun.cdTse}.json` : null
  );

  const passaFiltro = (m: Municipio) =>
    capital === "todos" ? true : capital === "capitais" ? m.capital : !m.capital;
  const noEscopo = (m: Municipio) =>
    uf ? m.uf === uf : regiao ? regiaoDaUf[m.uf] === regiao : m.uf !== "ZZ";

  const lista = useMemo(
    () => municipios.filter((m) => noEscopo(m) && passaFiltro(m)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [municipios, uf, regiao, capital, regiaoDaUf]
  );

  const escopoStats: Stats | null = useMemo(() => {
    if (!resumo) return null;
    if (mun) return mun;
    if (capital !== "todos" || regiao === EXTERIOR) return somar(lista);
    if (uf) return toStats(resumo.ufs[uf].s);
    if (regiao) return toStats(resumo.regioes[regiao]);
    return toStats(resumo.brasil);
  }, [resumo, mun, uf, regiao, capital, lista]);

  const pontos: LocalEspecial[] = subgrupo && subgrupo !== "exterior" && subgrupo !== "convencional"
    ? especiais.filter((e) => e.subgrupo === subgrupo) : [];

  function irBrasil() { setRegiao(null); setUf(null); setMun(null); setLocalAberto(null); }
  function irRegiao(r: string) { setRegiao(r); setUf(null); setMun(null); setLocalAberto(null); }
  function irUf(u: string) { setUf(u); setRegiao(regiaoDaUf[u] ?? null); setMun(null); setLocalAberto(null); }
  function irMun(m: Municipio) { setUf(m.uf); setRegiao(regiaoDaUf[m.uf] ?? null); setMun(m); setLocalAberto(null); }

  const scope: MapScope = { regiao: regiao === EXTERIOR ? null : regiao, uf };
  const pronto = resumo && munJson && perfil;
  const escopoNome = mun ? mun.nome : uf ? UF_NOME[uf] : regiao ?? "Brasil";
  const escopoSub = mun ? UF_NOME[mun.uf] : uf ? regiaoDaUf[uf] : regiao ? "Região" : "Resultado nacional";

  return (
    <section id={SECTIONS.RESULTS} className="px-3 pt-3 pb-10 sm:px-4">
      <div className="mx-auto max-w-[1600px]">
        {!pronto || !escopoStats ? (
          <div className="space-y-3">
            <div className="h-36 animate-pulse rounded-2xl bg-soft" />
            <div className="h-[640px] animate-pulse rounded-2xl bg-soft" />
          </div>
        ) : (
          <>
            <Placar s={toStats(resumo.brasil)} />

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[290px_minmax(0,1fr)_370px]">
              {/* Mapa */}
              <div className="relative order-1 h-[72vh] min-h-[460px] overflow-hidden rounded-2xl border border-line bg-card shadow-card lg:h-[calc(100vh-232px)] lg:min-h-[600px] xl:order-2">
                {regiao === EXTERIOR ? (
                  <div className="h-full overflow-y-auto p-4 scroll-fino">
                    <ListaMunicipios lista={lista} onSelect={() => undefined} titulo="Cidades no exterior" />
                  </div>
                ) : (
                  <MapaEleitoral
                    municipios={municipios}
                    resumo={resumo}
                    regiaoDaUf={regiaoDaUf}
                    scope={scope}
                    camada={camada}
                    nivel={uf ? "municipios" : nivel}
                    passaFiltro={passaFiltro}
                    filtroKey={capital}
                    selecionado={mun}
                    detalhe={detalhe}
                    pontos={pontos}
                    onUf={irUf}
                    onMunicipio={irMun}
                    onLocal={setLocalAberto}
                    onBrasil={irBrasil}
                  />
                )}

                {/* Controles sobre o mapa */}
                <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
                  <Trilha regiao={regiao} uf={uf} mun={mun} onBrasil={irBrasil} onRegiao={irRegiao} onUf={irUf} />
                  <div className="pointer-events-auto ml-auto flex flex-wrap items-center gap-1.5">
                    {!uf && regiao !== EXTERIOR && (
                      <Pilulas
                        valor={nivel}
                        onChange={setNivel}
                        opcoes={[{ id: "municipios", label: "Municípios" }, { id: "estados", label: "Estados" }]}
                        rotulo="Colorir por"
                      />
                    )}
                    <select value={camada} onChange={(e) => setCamada(e.target.value as Camada)} aria-label="O que o mapa mostra"
                      className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink-2 shadow-card">
                      {CAMADAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <select value={capital} onChange={(e) => setCapital(e.target.value as FiltroCapital)} aria-label="Capital ou interior"
                      className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink-2 shadow-card">
                      <option value="todos">Capitais e interior</option>
                      <option value="capitais">Só capitais</option>
                      <option value="interior">Só interior</option>
                    </select>
                  </div>
                </div>

                {regiao !== EXTERIOR && (
                  <Legenda camada={camada} lista={lista} nivel={uf ? "municipios" : nivel} resumo={resumo} mun={mun}
                    subgrupo={subgrupo} onLimparSubgrupo={() => setSubgrupo(null)} />
                )}
              </div>

              {/* Coluna esquerda */}
              <aside className="order-3 space-y-3 lg:col-span-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0 xl:order-1 xl:col-span-1 xl:block xl:space-y-3 xl:h-[calc(100vh-232px)] xl:min-h-[600px] xl:overflow-y-auto scroll-fino">
                {nacional && <CardTardios d={nacional} />}
                <PorRegiao resumo={resumo} municipios={municipios} ativa={regiao} onRegiao={(r) => (r === regiao && !uf ? irBrasil() : irRegiao(r))} />
                <SubgruposMini resumo={resumo} scope={scope} regiaoDaUf={regiaoDaUf} ativo={subgrupo}
                  onAtivo={(s) => setSubgrupo(s === subgrupo ? null : s)} />
              </aside>

              {/* Coluna direita */}
              <aside className="order-2 flex min-h-0 flex-col gap-3 xl:order-3 lg:h-[calc(100vh-232px)] lg:min-h-[600px]">
                <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-xl font-semibold text-ink">{escopoNome}</h2>
                      <p className="text-xs text-muted">
                        {escopoSub}
                        {capital !== "todos" && !mun ? (capital === "capitais" ? " · só capitais" : " · só interior") : ""}
                      </p>
                    </div>
                    {(uf || regiao) && (
                      <button onClick={irBrasil} aria-label="Voltar ao Brasil" title="Voltar ao Brasil"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-soft">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <BarraResultado s={escopoStats} />
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                    <Dado k="Margem" v={pp(margem(escopoStats)).replace(" p.p.", "")} />
                    <Dado k="Votantes" v={num(escopoStats.comp)} />
                    <Dado k="Abstenção" v={pct(pctAbstencao(escopoStats))} />
                    <Dado k="Brancos+nulos" v={pct(pctBrancoNulo(escopoStats))} />
                    <Dado k="Seções" v={num(escopoStats.secoes)} />
                    <Dado k="Após 17h" v={num(escopoStats.pos17)} destaque={escopoStats.pos17 > 0}
                      titulo={`${pct(pctPos17(escopoStats), 3)} do comparecimento${!uf && !regiao ? " (inclui exterior em hora local)" : ""}`} />
                  </dl>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-card p-4 shadow-card">
                  {mun ? (
                    <>
                      <div className="mb-3 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold text-ink">Locais de votação</h3>
                        <button onClick={() => irUf(mun.uf)} className="text-xs text-ink-3 hover:text-ink">
                          ← {UF_NOME[mun.uf]}
                        </button>
                      </div>
                      <MunicipioDetalhe data={detalhe} loading={carregandoDetalhe} aberto={localAberto} onAberto={setLocalAberto} />
                    </>
                  ) : regiao !== EXTERIOR ? (
                    <ListaMunicipios lista={lista} onSelect={irMun} titulo={uf ? "Municípios" : "Maiores municípios"} />
                  ) : (
                    <p className="text-sm text-ink-3">
                      No exterior, os horários do log ficam no fuso local de cada país; “votos após 17h” segue
                      o horário local de encerramento.
                    </p>
                  )}
                </div>
              </aside>
            </div>

            <div id="subgrupos" className="mx-auto mt-16 max-w-6xl">
              <Cabecalho kicker="Seções especiais" titulo="Subgrupos">
                Quem venceu em presídios, unidades de internação, aldeias, quilombos, voto em trânsito e exterior.
                Escopo: <strong className="text-ink">{escopoNome === mun?.nome ? UF_NOME[mun.uf] : escopoNome}</strong>.
                Clique num subgrupo para ver cada local e marcá-lo no mapa.
              </Cabecalho>
              <SubgruposPanel resumo={resumo} especiais={especiais} municipios={municipios} scope={scope}
                regiaoDaUf={regiaoDaUf} ativo={subgrupo} onAtivo={setSubgrupo} />
            </div>

            <div className="mx-auto mt-16 max-w-6xl">
              <Cabecalho kicker="Quem vota onde" titulo="Perfil do eleitorado">
                Como votaram as seções conforme a composição do seu eleitorado (idade, escolaridade, gênero, biometria).
              </Cabecalho>
              <PerfilPanel perfil={perfil} escopo={uf ?? (regiao && regiao !== EXTERIOR ? regiao : "BR")} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ---------- peças ----------

function Cabecalho({ kicker, titulo, children }: { kicker: string; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{kicker}</p>
      <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{titulo}</h2>
      {children && <p className="mt-2 max-w-2xl text-ink-3">{children}</p>}
    </div>
  );
}

function Trilha({ regiao, uf, mun, onBrasil, onRegiao, onUf }: {
  regiao: string | null; uf: string | null; mun: Municipio | null;
  onBrasil: () => void; onRegiao: (r: string) => void; onUf: (u: string) => void;
}) {
  const itens: { label: string; onClick?: () => void }[] = [{ label: "Brasil", onClick: onBrasil }];
  if (regiao) itens.push({ label: regiao, onClick: () => onRegiao(regiao) });
  if (uf) itens.push({ label: UF_NOME[uf], onClick: () => onUf(uf) });
  if (mun) itens.push({ label: mun.nome });
  return (
    <nav aria-label="Nível do mapa"
      className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-line bg-card px-1.5 py-1 text-xs shadow-card scrollbar-hide">
      {itens.map((it, i) => {
        const ultimo = i === itens.length - 1;
        return (
          <span key={it.label} className="flex shrink-0 items-center gap-0.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted" aria-hidden />}
            {ultimo ? (
              <span className="rounded-full bg-soft-2 px-2.5 py-1 font-semibold text-ink">{it.label}</span>
            ) : (
              <button onClick={it.onClick} className="rounded-full px-2.5 py-1 font-medium text-ink-3 hover:bg-soft hover:text-ink">
                {it.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function Pilulas<T extends string>({ valor, onChange, opcoes, rotulo }: {
  valor: T; onChange: (v: T) => void; opcoes: { id: T; label: string }[]; rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-full border border-line bg-card p-0.5 shadow-card">
      {opcoes.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={valor === o.id}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            valor === o.id ? "bg-ink text-card" : "text-ink-3 hover:text-ink"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dado({ k, v, destaque, titulo }: { k: string; v: string; destaque?: boolean; titulo?: string }) {
  return (
    <div title={titulo} className="min-w-0">
      <dt className="text-[11px] text-muted">{k}</dt>
      <dd className={`truncate font-medium tabular-nums ${destaque ? "text-late-ink" : "text-ink"}`}>{v}</dd>
    </div>
  );
}

function CardTardios({ d }: { d: NacionalJson }) {
  const { resultado: r, tardios: t } = d;
  const fr = t.votos / r.diferenca;
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-late-ink">
        <Clock className="h-3.5 w-3.5" aria-hidden /> Votos após 17h
      </div>
      <p className="font-serif text-4xl font-semibold tabular-nums text-ink">{num(t.votos)}</p>
      <p className="mt-1 text-sm text-ink-3">
        <strong className="text-ink">{pct(fr, 2)}</strong> da diferença final de {num(r.diferenca)} votos.
      </p>
      <div className="mt-3 space-y-1.5" aria-hidden>
        <div className="h-2 rounded-full bg-ink-3/70" />
        <div className="h-2 rounded-full bg-soft-2">
          <div className="h-2 rounded-full bg-late" style={{ width: `max(${fr * 100}%, 4px)` }} />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">Barras na mesma escala: diferença × votos após 17h.</p>
      <p className="mt-3 text-sm text-ink-2">
        Mesmo que todos tivessem ido para o vencedor e fossem anulados, <strong>o resultado não muda</strong>.
      </p>
      <a href={`#${SECTIONS.HERO}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
        Ver a análise completa <ArrowDown className="h-3 w-3" />
      </a>
    </div>
  );
}

function PorRegiao({ resumo, municipios, ativa, onRegiao }: {
  resumo: ResumoJson; municipios: Municipio[]; ativa: string | null; onRegiao: (r: string) => void;
}) {
  const t1 = useMemo(() => {
    const m: Record<string, { l: number; f: number }> = {};
    const reg: Record<string, string> = {};
    for (const [u, v] of Object.entries(resumo.ufs)) reg[u] = v.regiao;
    for (const x of municipios) {
      const a = (m[reg[x.uf]] ??= { l: 0, f: 0 });
      a.l += x.t1Lula;
      a.f += x.t1Flavio;
    }
    return m;
  }, [resumo, municipios]);

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <h3 className="mb-1 text-sm font-semibold text-ink">Por região</h3>
      <p className="mb-2 text-[11px] text-muted">Δ = variação de Lula entre os dois finalistas desde o 1º turno.</p>
      <ul className="-mx-1.5">
        {[...REGIOES, EXTERIOR].map((r) => {
          const s = toStats(resumo.regioes[r]);
          const p = pctLula(s);
          const v = vencedor(s);
          const a = t1[r];
          const delta = a && a.l + a.f ? p - a.l / (a.l + a.f) : NaN;
          return (
            <li key={r}>
              <button onClick={() => onRegiao(r)} aria-pressed={ativa === r}
                className={`w-full rounded-lg px-1.5 py-2 text-left transition-colors ${ativa === r ? "bg-soft-2" : "hover:bg-soft"}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">{r}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold" style={{ color: v === "flavio" ? "var(--flavio)" : "var(--lula)" }}>
                      {v === "flavio" ? "Flávio" : "Lula"} {pct(v === "flavio" ? 1 - p : p)}
                    </span>
                    {Number.isFinite(delta) && (
                      <span className="ml-1.5 text-[11px] text-muted">Δ {delta >= 0 ? "+" : "−"}{Math.abs(delta * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
                    )}
                  </span>
                </div>
                <div className="relative mt-1.5 flex h-1.5 gap-[2px]">
                  <div className="rounded-l-full" style={{ width: `${p * 100}%`, background: "var(--lula)" }} />
                  <div className="flex-1 rounded-r-full" style={{ background: "var(--flavio)" }} />
                  <div className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-ink" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SubgruposMini({ resumo, scope, regiaoDaUf, ativo, onAtivo }: {
  resumo: ResumoJson; scope: MapScope; regiaoDaUf: Record<string, string>;
  ativo: Subgrupo | null; onAtivo: (s: Subgrupo) => void;
}) {
  const porSub = useMemo(() => {
    const out = new Map<Subgrupo, Stats>();
    if (!scope.uf && !scope.regiao) {
      for (const [k, v] of Object.entries(resumo.subgrupos)) out.set(k as Subgrupo, toStats(v));
      return out;
    }
    const acc = new Map<Subgrupo, Stats[]>();
    for (const r of resumo.subgrupos_uf) {
      const u = r[0] as string;
      if (scope.uf ? u !== scope.uf : regiaoDaUf[u] !== scope.regiao) continue;
      const k = r[1] as Subgrupo;
      acc.set(k, [...(acc.get(k) ?? []), toStats(r.slice(2) as number[])]);
    }
    for (const [k, v] of acc) out.set(k, somar(v));
    return out;
  }, [resumo, scope.uf, scope.regiao, regiaoDaUf]);

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <h3 className="mb-1 text-sm font-semibold text-ink">Seções especiais</h3>
      <p className="mb-2 text-[11px] text-muted">Clique para marcar os locais no mapa.</p>
      <ul className="-mx-1.5">
        {SUBGRUPOS_MINI.map((k) => {
          const s = porSub.get(k);
          if (!s || !s.secoes) return null;
          const p = pctLula(s);
          const v = vencedor(s);
          return (
            <li key={k}>
              <button onClick={() => onAtivo(k)} aria-pressed={ativo === k} title={SUBGRUPO_LABEL[k]}
                className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors ${ativo === k ? "bg-soft-2" : "hover:bg-soft"}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${ativo === k ? "border-ink bg-ink" : "border-line-2"}`} />
                <span className="min-w-0 flex-1 truncate text-ink-2">{SUBGRUPO_CURTO[k]}</span>
                <span className="text-[11px] text-muted tabular-nums">{num(s.secoes)}</span>
                <span className="w-14 text-right font-semibold tabular-nums" style={{ color: v === "flavio" ? "var(--flavio)" : "var(--lula)" }}>
                  {pct(v === "flavio" ? 1 - p : p, 0)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <a href="#subgrupos" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
        Detalhes por local <ArrowDown className="h-3 w-3" />
      </a>
    </div>
  );
}

function ListaMunicipios({ lista, onSelect, titulo }: { lista: Municipio[]; onSelect: (m: Municipio) => void; titulo: string }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"votos" | "lula" | "flavio">("votos");
  const [limite, setLimite] = useState(50);

  const itens = useMemo(() => {
    const q = busca.trim().toUpperCase();
    const f = lista.filter((m) => !q || m.nome.toUpperCase().includes(q));
    const key = (m: Municipio) => (ordem === "votos" ? m.comp : ordem === "lula" ? margem(m) : -margem(m));
    return [...f].sort((a, b) => key(b) - key(a));
  }, [lista, busca, ordem]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar"
          className="rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink-2">
          <option value="votos">Mais votantes</option>
          <option value="lula">Maior margem Lula</option>
          <option value="flavio">Maior margem Flávio</option>
        </select>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(50); }}
          placeholder="Buscar município" aria-label="Buscar município"
          className="w-full rounded-xl border border-line bg-soft py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-line-2 focus:bg-card focus:outline-none" />
      </div>
      <p className="mb-1 text-[11px] text-muted">{num(itens.length)} municípios</p>
      <ul className="-mx-1 min-h-[240px] flex-1 overflow-y-auto pr-1 scroll-fino">
        {itens.slice(0, limite).map((m) => {
          const p = pctLula(m);
          return (
            <li key={m.cdTse}>
              <button onClick={() => onSelect(m)} className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-soft">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-ink">
                    {m.nome}
                    {m.uf !== "ZZ" && <span className="text-muted"> · {m.uf}</span>}
                    {m.capital && <span className="ml-1.5 rounded bg-soft-2 px-1 py-px text-[10px] font-medium uppercase text-ink-3">capital</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{num(m.comp)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-10 text-[11px] font-semibold tabular-nums" style={{ color: "var(--lula)" }}>{pct(p, 0)}</span>
                  <div className="flex h-1.5 flex-1 gap-[2px]">
                    <div className="rounded-l-full" style={{ width: `${p * 100}%`, background: "var(--lula)" }} />
                    <div className="flex-1 rounded-r-full" style={{ background: "var(--flavio)" }} />
                  </div>
                  <span className="w-10 text-right text-[11px] font-semibold tabular-nums" style={{ color: "var(--flavio)" }}>{pct(1 - p, 0)}</span>
                </div>
              </button>
            </li>
          );
        })}
        {itens.length > limite && (
          <li>
            <button onClick={() => setLimite(limite + 100)}
              className="mt-1 w-full rounded-lg border border-line py-2 text-xs text-ink-3 hover:bg-soft">
              Mostrar mais ({num(itens.length - limite)} restantes)
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function Legenda({ camada, lista, nivel, resumo, mun, subgrupo, onLimparSubgrupo }: {
  camada: Camada; lista: Municipio[]; nivel: NivelCor; resumo: ResumoJson; mun: Municipio | null;
  subgrupo: Subgrupo | null; onLimparSubgrupo: () => void;
}) {
  const p = PALETA[useTema()];
  const desc = CAMADAS.find((c) => c.id === camada)!.desc;
  const venceu = useMemo(() => {
    let l = 0, f = 0;
    for (const m of lista) {
      const v = vencedor(m);
      if (v === "lula") l++;
      else if (v === "flavio") f++;
    }
    return { l, f };
  }, [lista]);

  let corpo: React.ReactNode;
  if (camada === "margem") {
    const passos = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1].map((t) => t * MARGEM_MAX);
    corpo = (
      <>
        <div className="mb-1.5 flex gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--lula)" }} />
            Lula <strong className="tabular-nums text-ink">{num(venceu.l)}</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--flavio)" }} />
            Flávio <strong className="tabular-nums text-ink">{num(venceu.f)}</strong></span>
          <span className="text-muted">municípios</span>
        </div>
        <div className="flex h-2 w-52 gap-[2px]">
          {passos.map((m, i) => (
            <div key={i} className="flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: corMargem(m, p) }} />
          ))}
        </div>
        <div className="mt-0.5 flex w-52 justify-between text-[10px] text-muted tabular-nums">
          <span>Flávio +{MARGEM_MAX * 100}</span><span>margem (p.p.)</span><span>Lula +{MARGEM_MAX * 100}</span>
        </div>
      </>
    );
  } else if (camada === "virada") {
    const ordem: Virada[] = ["virou_lula", "manteve_lula", "manteve_flavio", "virou_flavio"];
    corpo = (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {ordem.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: viradaCor(v, p) }} />{VIRADA_LABEL[v]}
          </span>
        ))}
      </div>
    );
  } else {
    const valores = nivel === "estados"
      ? Object.entries(resumo.ufs).filter(([u]) => u !== "ZZ").map(([, v]) => valorCamada(camada, toStats(v.s)))
      : lista.map((m) => valorCamada(camada, m));
    const [lo, hi] = dominio(valores);
    const alto = camada === "pos17" ? p.pos17Alto : p.seqAlto;
    const d = camada === "pos17" ? 3 : 1;
    corpo = (
      <>
        <div className="flex h-2 w-52 gap-[2px]">
          {Array.from({ length: 7 }, (_, i) => lo + ((hi - lo) * i) / 6).map((v, i) => (
            <div key={i} className="flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: corSeq(v, lo, hi, alto, p) }} />
          ))}
        </div>
        <div className="mt-0.5 flex w-52 justify-between text-[10px] text-muted tabular-nums">
          <span>{pct(lo, d)}</span><span>{pct(hi, d)}</span>
        </div>
      </>
    );
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] space-y-2">
      {subgrupo && (
        <button onClick={onLimparSubgrupo}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink shadow-card hover:bg-soft">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-ink" /> {SUBGRUPO_LABEL[subgrupo]} <X className="h-3 w-3 text-muted" />
        </button>
      )}
      <div className="rounded-xl border border-line bg-card/95 px-3 py-2.5 text-ink-2 shadow-card backdrop-blur">
        {corpo}
        <p className="mt-1.5 max-w-60 text-[10px] leading-snug text-muted">
          {mun
            ? "Círculos = locais de votação (tamanho = votantes; borda amarela = teve voto após 17h)."
            : camada === "margem" ? "Intensidade = margem sobre os votos válidos." : desc}
        </p>
      </div>
    </div>
  );
}

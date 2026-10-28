"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, ExternalLink, Search, XCircle } from "lucide-react";
import { useJsonData } from "@/hooks/useJsonData";
import { SECTIONS } from "@/lib/constants";
import {
  MAPA_BASE, SUBGRUPO_LABEL, UF_NOME, num, parseMunicipios, pct,
  type MunDetalheJson, type Municipio, type MunicipiosJson, type SecaoRow, type Subgrupo,
} from "@/lib/mapa";
import { hhmm, hhmmss, ouvirConfira, urlTseSecao } from "@/lib/site";
import { Panel, SectionHeader, Skeleton } from "@/components/shared/Section";
import { BarraResultado } from "@/components/mapa/BarraResultado";

interface SecaoSel {
  row: SecaoRow;
  local: string;
  bairro: string | null;
  subgrupo: Subgrupo;
}

export function ExploreSection() {
  const { data: munJson } = useJsonData<MunicipiosJson>(`${MAPA_BASE}/municipios.json`);
  const municipios = useMemo(() => (munJson ? parseMunicipios(munJson) : []), [munJson]);

  const [uf, setUf] = useState("SP");
  const [mun, setMun] = useState<Municipio | null>(null);
  const [chave, setChave] = useState<string | null>(null); // "zona-secao"
  const [busca, setBusca] = useState("");
  const [soTardias, setSoTardias] = useState(false);
  const [pedido, setPedido] = useState<{ cdTse: number; zona?: number; secao?: number } | null>(null);

  const { data: det } = useJsonData<MunDetalheJson>(mun ? `${MAPA_BASE}/mun/${mun.cdTse}.json` : null);

  // Pedidos vindos de outras seções (ranking, cenários)
  useEffect(() => ouvirConfira((a) => {
    setUf(a.uf);
    setPedido({ cdTse: a.cdTse, zona: a.zona, secao: a.secao });
  }), []);

  useEffect(() => {
    if (!pedido || !municipios.length) return;
    const m = municipios.find((x) => x.cdTse === pedido.cdTse) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aplica pedido externo após dados carregarem
    setMun(m);
    setChave(pedido.zona != null && pedido.secao != null ? `${pedido.zona}-${pedido.secao}` : null);
    setSoTardias(pedido.secao == null);
    setPedido(null);
  }, [pedido, municipios]);

  const munsUf = useMemo(() => municipios.filter((m) => m.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome)), [municipios, uf]);

  const secoes: SecaoSel[] = useMemo(() => {
    if (!det) return [];
    return det.locais
      .flatMap((l) => l.secoes.map((row) => ({ row, local: l.nome, bairro: l.bairro, subgrupo: l.subgrupo })))
      .sort((a, b) => a.row[0] - b.row[0] || a.row[1] - b.row[1]);
  }, [det]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return secoes.filter((s) => (!soTardias || (s.row[7] ?? 0) > 0)
      && (!q || String(s.row[1]) === q || `${s.row[0]}/${s.row[1]}` === q || s.local.toUpperCase().includes(q)));
  }, [secoes, busca, soTardias]);

  const sel = secoes.find((s) => `${s.row[0]}-${s.row[1]}` === chave) ?? null;

  return (
    <section id={SECTIONS.EXPLORE} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader kicker="Dados brutos" title="Confira você mesmo">
          Escolha qualquer seção do país e veja o que o log da urna registrou e o resultado oficial. Cada número tem link
          para o arquivo original no TSE.
        </SectionHeader>

        {!munJson ? <Skeleton /> : (
          <div className="grid lg:grid-cols-5 gap-5">
            <Panel className="lg:col-span-2">
              <div className="grid grid-cols-[90px_1fr] gap-2 mb-3">
                <select value={uf} onChange={(e) => { setUf(e.target.value); setMun(null); setChave(null); }} aria-label="Estado"
                  className="rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink-2">
                  {Object.keys(UF_NOME).sort().map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={mun?.cdTse ?? ""} aria-label="Município"
                  onChange={(e) => { setMun(munsUf.find((m) => m.cdTse === Number(e.target.value)) ?? null); setChave(null); setBusca(""); }}
                  className="rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink-2 min-w-0">
                  <option value="">Município…</option>
                  {munsUf.map((m) => <option key={m.cdTse} value={m.cdTse}>{m.nome}</option>)}
                </select>
              </div>

              {mun && (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nº da seção, zona/seção ou local"
                      aria-label="Buscar seção"
                      className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-line-2 focus:outline-none" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink-3 mb-2 cursor-pointer">
                    <input type="checkbox" checked={soTardias} onChange={(e) => setSoTardias(e.target.checked)} className="accent-[var(--late)]" />
                    Só seções com voto após 17h
                  </label>
                  {!det ? <Skeleton h="h-64" /> : (
                    <>
                      <p className="text-xs text-muted mb-1">{num(filtradas.length)} seções</p>
                      <ul className="max-h-[440px] overflow-y-auto pr-1 space-y-0.5">
                        {filtradas.slice(0, 400).map((s) => {
                          const k = `${s.row[0]}-${s.row[1]}`;
                          return (
                            <li key={k}>
                              <button onClick={() => setChave(k)} aria-pressed={chave === k}
                                className={`w-full text-left rounded-lg px-2.5 py-1.5 text-sm flex justify-between gap-2 ${
                                  chave === k ? "bg-soft-2/70" : "hover:bg-soft"}`}>
                                <span className="truncate">
                                  <span className="text-ink tabular-nums">Z{s.row[0]} · S{s.row[1]}</span>
                                  <span className="text-muted text-xs ml-2">{s.local}</span>
                                </span>
                                {(s.row[7] ?? 0) > 0 && <span className="text-xs text-late-ink tabular-nums shrink-0">{s.row[7]} após 17h</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {filtradas.length > 400 && <p className="text-xs text-muted mt-1">Mostrando 400 — refine a busca.</p>}
                    </>
                  )}
                </>
              )}
              {!mun && <p className="text-sm text-muted">Escolha um município. Dica: no ranking ou nos cenários, clique num município para abri-lo aqui.</p>}
            </Panel>

            <div className="min-w-0 lg:col-span-3">
              {sel && mun ? <DetalheSecao s={sel} mun={mun} /> : (
                <Panel className="h-full flex items-center justify-center min-h-64">
                  <p className="text-sm text-muted text-center max-w-xs">
                    {mun ? "Escolha uma seção na lista." : "Nenhuma seção selecionada."}
                  </p>
                </Panel>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DetalheSecao({ s, mun }: { s: SecaoSel; mun: Municipio }) {
  const [zona, secao, aptos, comp, lula, flavio, bn, pos17, ultimo, abertura, primeiro, horas, tardios] = s.row;
  const temLog = horas != null;
  const votosLog = horas ? horas.reduce((a, b) => a + b, 0) : null;
  const conc = votosLog != null && Math.abs(votosLog - comp) <= Math.max(1, comp * 0.01);
  const serie = (horas ?? []).map((v, i) => ({ h: 6 + i, v }));
  const st = { secoes: 1, aptos, comp, lula, flavio, bn, pos17: pos17 ?? 0 };
  const url = urlTseSecao(mun.uf, mun.cdTse, zona, secao);

  return (
    <Panel>
      <p className="text-xs text-muted">{mun.nome} ({mun.uf}) · Zona {zona} · Seção {secao}</p>
      <h3 className="text-lg font-semibold text-ink leading-tight">{s.local}</h3>
      <p className="text-xs text-muted mb-4">
        {s.bairro}{s.subgrupo !== "convencional" && <span className="ml-1.5 rounded bg-soft-2 px-1.5 py-0.5 text-ink-2">{SUBGRUPO_LABEL[s.subgrupo]}</span>}
      </p>

      <BarraResultado s={st} />
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
        <D k="Lula" v={num(lula)} /><D k="Flávio" v={num(flavio)} />
        <D k="Brancos + nulos" v={num(bn)} /><D k="Comparecimento" v={`${num(comp)} de ${num(aptos)}`} />
      </dl>

      <div className="mt-6 pt-5 border-t border-line">
        <h4 className="text-sm font-semibold text-ink mb-3">O que o log da urna registrou</h4>
        {!temLog ? (
          <p className="text-sm text-muted">O TSE não publicou log para esta seção.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <D k="Urna pronta" v={abertura != null ? hhmm(abertura) : "—"} />
              <D k="Primeiro voto" v={primeiro != null ? hhmm(primeiro) : "—"} />
              <D k="Último voto" v={ultimo != null ? hhmm(ultimo) : "—"} />
              <D k="Votos após 17h" v={num(pos17 ?? 0)} destaque={(pos17 ?? 0) > 0} />
            </dl>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <XAxis dataKey="h" stroke="var(--muted)" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}h`} interval={1} />
                <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--soft)" }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs">
                      <p className="text-ink-3">{payload[0].payload.h}h–{payload[0].payload.h + 1}h</p>
                      <p className="text-ink font-semibold">{num(payload[0].payload.v)} votos</p>
                    </div>
                  ) : null} />
                <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {serie.map((p) => <Cell key={p.h} fill={p.h >= 17 ? "var(--late)" : "var(--ink-3)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted mb-3">Votos por hora (Brasília). Âmbar = após 17h.</p>

            {tardios && tardios.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-3 mb-1.5">Horário de cada voto após 17h:</p>
                <div className="flex flex-wrap gap-1">
                  {tardios.map((t, i) => (
                    <span key={i} className="rounded bg-late px-1.5 py-0.5 text-[11px] text-late-ink tabular-nums">{hhmmss(t)}</span>
                  ))}
                </div>
              </div>
            )}

            <p className={`flex items-center gap-1.5 text-sm ${conc ? "text-accent" : "text-late-ink"}`}>
              {conc ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
              Log: {num(votosLog ?? 0)} votos · Comparecimento oficial: {num(comp)}
              {conc ? " — conferem" : " — divergem"}
            </p>
          </>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-line text-xs text-ink-3 space-y-1.5">
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent hover:text-accent">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />Índice dos arquivos desta seção no TSE
        </a>
        <p>
          O índice lista o boletim de urna (-bu.dat), o log (-log.jez) e o registro digital do voto. Para refazer a conta:
          baixe o log, abra o ZIP, e conte as linhas “O voto do eleitor foi computado” do dia 25/10/2026. Horários do log
          estão na hora local da urna{mun.uf !== "ZZ" ? "; aqui convertidos para Brasília" : ""}.
          Proporção após 17h nesta seção: {pct((pos17 ?? 0) / Math.max(1, comp), 2)}.
        </p>
      </div>
    </Panel>
  );
}

function D({ k, v, destaque = false }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={`tabular-nums ${destaque ? "text-late-ink font-semibold" : "text-ink"}`}>{v}</dd>
    </div>
  );
}

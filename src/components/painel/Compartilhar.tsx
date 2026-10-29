"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, Share2, X } from "lucide-react";
import { FORMATOS, canvasParaArquivo, desenharCartao, type DadosCartao, type Formato } from "@/lib/cartao";
import { useTema } from "@/hooks/useTema";

/** Janela com a prévia da imagem para o Instagram, link e botões de compartilhar. */
export function Compartilhar({ dados, onFechar }: { dados: DadosCartao; onFechar: () => void }) {
  const tema = useTema();
  const [formato, setFormato] = useState<Formato>("post");
  const [img, setImg] = useState<{ url: string; arquivo: File } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [podeCompartilharArquivo, setPodeCompartilharArquivo] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vivo = true;
    let url: string | null = null;
    desenharCartao(dados, formato)
      .then((cv) => canvasParaArquivo(cv, `${dados.arquivo}-${formato}.png`))
      .then((arquivo) => {
        if (!vivo) return;
        url = URL.createObjectURL(arquivo);
        setImg({ url, arquivo });
        setPodeCompartilharArquivo(!!navigator.canShare?.({ files: [arquivo] }));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dados, formato, tema]);

  useEffect(() => {
    fechar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [onFechar]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(dados.link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      window.prompt("Copie o link:", dados.link);
    }
  }

  async function compartilhar() {
    if (!img) return;
    try {
      await navigator.share({ files: [img.arquivo], title: dados.titulo, text: dados.link });
    } catch {
      /* usuário cancelou */
    }
  }

  function baixar() {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img.url;
    a.download = img.arquivo.name;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onFechar}>
      <div role="dialog" aria-modal="true" aria-label={`Compartilhar ${dados.titulo}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-xl sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{dados.tipo}</p>
            <h2 className="truncate font-serif text-lg font-semibold text-ink">{dados.titulo}</h2>
          </div>
          <button ref={fechar} onClick={onFechar} aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 scroll-fino sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="grid place-items-center rounded-xl bg-soft p-3">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={`Imagem para compartilhar: ${dados.titulo}`}
                className="max-h-[56vh] w-auto rounded-lg shadow-card" />
            ) : (
              <div className={`w-full max-w-[280px] animate-pulse rounded-lg bg-soft-2 ${formato === "story" ? "aspect-[9/16]" : "aspect-[4/5]"}`} />
            )}
          </div>

          <div className="space-y-3">
            <div role="group" aria-label="Formato" className="inline-flex w-full rounded-full border border-line bg-card p-0.5">
              {(Object.keys(FORMATOS) as Formato[]).map((f) => (
                <button key={f} onClick={() => setFormato(f)} aria-pressed={formato === f}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${formato === f ? "bg-ink text-card" : "text-ink-3 hover:text-ink"}`}>
                  {FORMATOS[f].label}
                </button>
              ))}
            </div>

            {podeCompartilharArquivo && (
              <button onClick={compartilhar} disabled={!img}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-card hover:opacity-90 disabled:opacity-50">
                <Share2 className="h-4 w-4" /> Compartilhar imagem
              </button>
            )}
            <button onClick={baixar} disabled={!img}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                podeCompartilharArquivo ? "border border-line text-ink-2 hover:bg-soft" : "bg-ink text-card hover:opacity-90"}`}>
              <Download className="h-4 w-4" /> Baixar imagem
            </button>
            <button onClick={copiar}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-soft">
              {copiado ? <Check className="h-4 w-4 text-accent" /> : <Link2 className="h-4 w-4" />}
              {copiado ? "Link copiado" : "Copiar link"}
            </button>
            <p className="break-all rounded-lg bg-soft px-3 py-2 text-[11px] text-ink-3">{dados.link}</p>
            <p className="text-[11px] leading-snug text-muted">
              No celular, “Compartilhar imagem” abre o Instagram direto. No computador, baixe a imagem e poste;
              cole o link na legenda ou no story.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

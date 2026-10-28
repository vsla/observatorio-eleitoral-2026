"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Moon, Sun } from "lucide-react";
import { SECTIONS, SECTION_LABELS } from "@/lib/constants";
import { trocarTema, useTema } from "@/hooks/useTema";

const secoes = Object.values(SECTIONS);

export function TopBar() {
  const tema = useTema();
  const [ativa, setAtiva] = useState<string>(secoes[0]);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAtiva(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    for (const id of secoes) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  async function compartilhar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // sem permissão de clipboard: nada a fazer
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <a href="#resultados" className="flex shrink-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-card font-serif text-sm font-bold">O</span>
          <span className="font-serif text-lg font-semibold tracking-tight text-ink">
            Observatório <span className="text-ink-3 font-medium">2026</span>
          </span>
        </a>

        <nav aria-label="Seções" className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <ul className="flex min-w-max items-center gap-0.5">
            {secoes.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={ativa === id ? "true" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    ativa === id ? "bg-soft-2 text-ink" : "text-ink-3 hover:text-ink hover:bg-soft"
                  }`}
                >
                  {SECTION_LABELS[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={compartilhar}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-soft"
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {copiado ? "Link copiado" : "Compartilhar"}
          </button>
          <button
            onClick={trocarTema}
            aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            title={tema === "dark" ? "Tema claro" : "Tema escuro"}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-ink-2 hover:bg-soft"
          >
            {tema === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

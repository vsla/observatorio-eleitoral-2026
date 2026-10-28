"use client";

import { useSyncExternalStore } from "react";

export type Tema = "light" | "dark";

function ler(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function assinar(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

/** Tema atual (atributo data-theme do <html>), reativo. */
export function useTema(): Tema {
  return useSyncExternalStore(assinar, ler, () => "light");
}

export function trocarTema() {
  const novo: Tema = ler() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = novo;
  try {
    localStorage.setItem("tema", novo);
  } catch {
    // modo privado: só não persiste
  }
}

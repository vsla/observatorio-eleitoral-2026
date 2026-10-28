export const SECTIONS = {
  RESULTS: "resultados",
  HERO: "visao-geral",
  TIMELINE: "timeline",
  MAP: "onde",
  SCENARIOS: "cenarios",
  CONSISTENCY: "consistencia",
  EXPLORE: "confira",
  METHODOLOGY: "metodologia",
} as const;

export const SECTION_LABELS: Record<string, string> = {
  [SECTIONS.RESULTS]: "Mapa",
  [SECTIONS.HERO]: "Após 17h",
  [SECTIONS.TIMELINE]: "Minuto a minuto",
  [SECTIONS.MAP]: "Onde",
  [SECTIONS.SCENARIOS]: "Cenários",
  [SECTIONS.CONSISTENCY]: "Consistência",
  [SECTIONS.EXPLORE]: "Confira",
  [SECTIONS.METHODOLOGY]: "Metodologia",
};

export const COLORS = {
  bg: "#020617",        // slate-950
  card: "#0f172a",      // slate-900
  cardHover: "#1e293b", // slate-800
  border: "#334155",    // slate-700
  text: "#f8fafc",      // slate-50
  textMuted: "#94a3b8",  // slate-400
  accent: "#34d399",     // emerald-400
  accentDim: "#065f46",  // emerald-900
  warn: "#fbbf24",       // amber-400
  mark17h: "#fbbf24",    // amber-400
} as const;

export const CANDIDATES = {
  lula: { nome: "Lula", color: "#64748b" },          // slate-500 (neutral)
  bolsonaro: { nome: "Flávio Bolsonaro", color: "#94a3b8" }, // slate-400 (neutral)
} as const;

export const ELECTION = {
  date: "25/10/2026",
  turno: 2,
  cutoff: 17, // 17h Brasilia
} as const;

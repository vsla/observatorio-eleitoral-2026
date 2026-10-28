/**
 * Format number with dot separators (Brazilian convention).
 * 1234567 → "1.234.567"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Format percentage with comma decimal.
 * 0.0349 → "0,03%"
 */
export function formatPercent(n: number, decimals = 2): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + "%";
}

/**
 * Format fractional hours to HH:MM.
 * 17.0575 → "17:03"
 */
export function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Format large numbers compactly.
 * 1200000 → "1,2M"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  }
  if (n >= 1_000) {
    return (n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  }
  return n.toLocaleString("pt-BR");
}

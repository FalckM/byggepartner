// Small Norwegian number formatters shared by engine messages (pure TS).

/** 20 → "2 cm", 5 → "0,5 cm", 15 → "1,5 cm" */
export function fmtCm(mm: number): string {
  const cm = Math.round(mm) / 10;
  return `${String(cm).replace(".", ",")} cm`;
}

export function fmtW(w: number): string {
  return `${Math.round(w)} W`;
}

export function joinNb(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

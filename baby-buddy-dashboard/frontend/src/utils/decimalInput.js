export function normalizeDecimalInput(value) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseDecimalInput(value) {
  const normalized = normalizeDecimalInput(value);
  if (!normalized) return Number.NaN;
  return Number.parseFloat(normalized);
}

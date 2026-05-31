export function isVitaminMedication(entry = {}) {
  const name = (entry.name || "").toLowerCase();
  const tags = (entry.tags || []).map((tag) => String(tag).toLowerCase());
  return (
    name.includes("vitamin") ||
    name.includes("vitamine") ||
    tags.includes("vitamin") ||
    tags.includes("vitamins")
  );
}

function localDayBounds(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function summarizeVitaminMedication(entries = [], now = new Date()) {
  const vitamins = entries
    .filter(isVitaminMedication)
    .slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  const { start, end } = localDayBounds(now);
  const today = vitamins.filter((entry) => {
    const time = new Date(entry.time);
    return time >= start && time <= end;
  });
  return {
    takenToday: today.length > 0,
    countToday: today.length,
    last: today[0] || vitamins[0] || null,
  };
}

export function getDefaultVitaminMedicationName(milkTotals = {}) {
  return (milkTotals.formula || 0) > 500 ? "Vitamin D" : "Vitamin K + D";
}

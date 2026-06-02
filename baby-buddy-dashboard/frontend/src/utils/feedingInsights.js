function toNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function entryTime(entry) {
  return entry?.end || entry?.start || entry?.time || entry?.date || null;
}

function roundUpToNearestTen(value) {
  return Math.ceil(value / 10) * 10;
}

function formatBreast(method) {
  const normalized = String(method || "").toLowerCase();
  if (normalized.includes("left breast")) return "Left";
  if (normalized.includes("right breast")) return "Right";
  if (normalized.includes("both breasts")) return "Both";
  return null;
}

export function calculateFeedingAmounts(weights) {
  const latest = (weights || [])
    .map((entry) => ({ ...entry, weightValue: toNumber(entry.weight) }))
    .filter((entry) => entry.weightValue != null)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

  if (!latest) return null;

  const dailyAmount = latest.weightValue * 150;
  return {
    weight: Math.round(latest.weightValue * 100) / 100,
    dailyAmount: roundUpToNearestTen(dailyAmount),
    sevenFeeds: roundUpToNearestTen(dailyAmount / 7),
    eightFeeds: roundUpToNearestTen(dailyAmount / 8),
  };
}

export function getLastBreastUsed(feedings) {
  const last = (feedings || [])
    .filter((feeding) => formatBreast(feeding.method))
    .sort((a, b) => new Date(entryTime(b) || 0) - new Date(entryTime(a) || 0))[0];

  if (!last) return null;

  return {
    breast: formatBreast(last.method),
    method: last.method,
    time: entryTime(last),
  };
}

export function summarizeFeedingMethods(feedings) {
  return (feedings || []).reduce(
    (totals, feeding) => {
      const method = String(feeding?.method || "").toLowerCase();
      const amount = toNumber(feeding?.amount) || 0;
      totals.total += 1;
      if (method.includes("bottle")) {
        totals.bottle += 1;
        totals.bottleAmount += amount;
      } else if (formatBreast(method)) {
        totals.breast += 1;
      } else {
        totals.other += 1;
      }
      return totals;
    },
    { bottle: 0, breast: 0, other: 0, total: 0, bottleAmount: 0 }
  );
}

export function summarizeMilkByType(feedings, now = new Date()) {
  const since = now.getTime() - 24 * 60 * 60 * 1000;
  return (feedings || []).reduce(
    (totals, feeding) => {
      const timestamp = new Date(entryTime(feeding) || 0).getTime();
      if (!Number.isFinite(timestamp) || timestamp < since || timestamp > now.getTime()) {
        return totals;
      }

      const amount = toNumber(feeding.amount) || 0;
      const type = String(feeding.type || "").toLowerCase();
      if (type.includes("formula")) {
        totals.formula += amount;
      } else if (type.includes("breast milk")) {
        totals.breastMilk += amount;
      }
      return totals;
    },
    { breastMilk: 0, formula: 0 }
  );
}

export function getVitaminRecommendation(milkTotals) {
  if ((milkTotals?.formula || 0) > 500) {
    return {
      label: "Vitamin D only",
      detail: "No vitamin K needed because formula is above 500 mL in the last 24 hours.",
    };
  }

  return {
    label: "Vitamin K + D required",
    detail: "Formula is 500 mL or less in the last 24 hours.",
  };
}

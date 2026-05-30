import assert from "node:assert/strict";
import {
  calculateFeedingAmounts,
  getLastBreastUsed,
  getVitaminRecommendation,
  summarizeMilkByType,
} from "../src/utils/feedingInsights.js";

const fixedNow = new Date("2026-05-30T12:00:00Z");

assert.deepEqual(calculateFeedingAmounts([{ weight: "3.5", date: "2026-05-30" }]), {
  weight: 3.5,
  dailyAmount: 530,
  sevenFeeds: 80,
  eightFeeds: 70,
});

assert.deepEqual(calculateFeedingAmounts([{ weight: "4", date: "2026-05-30" }]), {
  weight: 4,
  dailyAmount: 600,
  sevenFeeds: 90,
  eightFeeds: 80,
});

assert.equal(calculateFeedingAmounts([]), null);
assert.equal(calculateFeedingAmounts([{ weight: "not-a-number" }]), null);

assert.deepEqual(
  getLastBreastUsed([
    { start: "2026-05-30T08:00:00Z", method: "left breast" },
    { start: "2026-05-30T09:00:00Z", method: "bottle" },
    { start: "2026-05-30T10:00:00Z", method: "right breast" },
  ]),
  {
    breast: "Right",
    method: "right breast",
    time: "2026-05-30T10:00:00Z",
  }
);

assert.equal(getLastBreastUsed([{ start: "2026-05-30T09:00:00Z", method: "bottle" }]), null);

assert.deepEqual(
  summarizeMilkByType(
    [
      { start: "2026-05-30T11:00:00Z", type: "breast milk", amount: 60 },
      { start: "2026-05-30T10:00:00Z", type: "formula", amount: "90" },
      { start: "2026-05-30T09:00:00Z", type: "fortified breast milk", amount: 40 },
      { start: "2026-05-29T11:59:00Z", type: "formula", amount: 1000 },
      { start: "2026-05-30T08:00:00Z", type: "solid food", amount: 20 },
    ],
    fixedNow
  ),
  { breastMilk: 100, formula: 90 }
);

assert.deepEqual(getVitaminRecommendation({ breastMilk: 120, formula: 501 }), {
  label: "Vitamin D only",
  detail: "No vitamin K needed because formula is above 500 mL in the last 24 hours.",
});

assert.deepEqual(getVitaminRecommendation({ breastMilk: 120, formula: 500 }), {
  label: "Vitamin K + D required",
  detail: "Formula is 500 mL or less in the last 24 hours.",
});

console.log("feeding insight checks passed");
